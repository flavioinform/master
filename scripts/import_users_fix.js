
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ==========================================
// INSTRUCCIONES PARA EL USUARIO
// 1. Pega tu 'service_role' key abajo donde dice "PEGAR_AQUI_TU_KEY"
// 2. Asegúrate de que el archivo 'supabase_users_import.csv' esté en esta misma carpeta (o en la raíz del proyecto).
// 3. Ejecuta: node scripts/import_users_fix.js
// ==========================================

const SUPABASE_URL = "https://gkqvLqjZqXqKqZqX.supabase.co"; // Reemplaza si es necesario, o lo leemos del .env si quisiéramos, pero mejor hardcode o auto-detect.
// Voy a asumir que el usuario puede poner la URL también si no es esta.
// Mejor: Le pediré al usuario que llene las dos cosas para estar seguros.

const SUPABASE_PROJECT_URL = "PEGAR_TU_SUPABASE_URL_AQUI"; // Ej: https://xyz.supabase.co
const SERVICE_ROLE_KEY = "PEGAR_TU_SERVICE_ROLE_KEY_AQUI"; // Ej: eyJhbGci...

// Nombre del archivo CSV
const CSV_FILENAME = 'supabase_users_import.csv';

// ==========================================

async function main() {
    if (SUPABASE_PROJECT_URL.includes("PEGAR") || SERVICE_ROLE_KEY.includes("PEGAR")) {
        console.error("❌ ERROR: Debes abrir este archivo y pegar tu URL y tu SERVICE_ROLE_KEY en las líneas 13 y 14.");
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_PROJECT_URL, SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    const csvPath = path.resolve(process.cwd(), CSV_FILENAME);

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ ERROR: No encuentro el archivo '${CSV_FILENAME}' en ${process.cwd()}`);
        console.log("-> Por favor mueve el archivo descargado a la carpeta principal del proyecto.");
        process.exit(1);
    }

    console.log(`Leyendo ${CSV_FILENAME}...`);
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    // Skip header
    const dataLines = lines.slice(1);

    console.log(`Encontrados ${dataLines.length} usuarios para procesar.`);

    for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const parts = line.split(',');
        // CSV creado por nosotros: id,email,password,email_verified
        const tempId = parts[0]?.trim(); // ID temporal que pusimos en el Excel
        const email = parts[1]?.trim();
        const password = parts[2]?.trim();

        if (!email || !password) continue;

        console.log(`\n[${i + 1}/${dataLines.length}] Procesando ${email}...`);

        // 1. Crear Usuario en Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { source: 'bulk_import' }
        });

        if (authError) {
            console.error(`   ❌ Error creando Auth: ${authError.message}`);
            // Si ya existe, intentamos buscarlo para "reparar" el perfil
            if (authError.message.includes("already registered")) {
                // Buscar usuario por email (necesitamos listar users, que es lento, o asumir que podemos obtenerlo de otra forma)
                // admin.listUsers es posible.
                /* const { data: listData } = await supabase.auth.admin.listUsers(); ... no, muy lento si hay muchos. */
                console.log("   -> El usuario ya existe, saltando creación.");
            }
            continue;
        }

        const newAuthId = authData.user.id;
        console.log(`   ✅ Usuario Auth creado. ID: ${newAuthId}`);

        // 2. Actualizar el Perfil para que tenga el MISMO ID
        // Buscamos el perfil por email
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (profileError || !profileData) {
            console.error("   ❌ No se encontró perfil para este email. ¿Se subió el Excel?");
            continue;
        }

        // Si el ID ya coincide, genial.
        if (profileData.id === newAuthId) {
            console.log("   👌 El ID del perfil ya coincide.");
            continue;
        }

        // Si no coincide, tenemos que actualizarlo.
        // UPDATE profiles SET id = newAuthId WHERE email = email
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ id: newAuthId })
            .eq('email', email);

        if (updateError) {
            console.error(`   ❌ Error actualizando perfil ID: ${updateError.message}`);

            // Si falla porque "id" es PK y no deja actualizar (aunque debería),
            // Intentamos: Clonar -> Borrar -> Insertar
            console.log("   🔄 Intentando estrategia Clonar-Borrar-Insertar...");

            // 1. Borrar viejo
            await supabase.from('profiles').delete().eq('id', profileData.id);

            // 2. Insertar nuevo con ID correcto
            const newProfile = { ...profileData, id: newAuthId };
            const { error: insertError } = await supabase.from('profiles').insert(newProfile);

            if (insertError) {
                console.error(`   ❌ Falló re-inserción: ${insertError.message}`);
            } else {
                console.log("   ✅ Perfil corregido (re-insertado).");
            }

        } else {
            console.log("   ✅ Perfil actualizado vinculando al nuevo Auth ID.");
        }
    }

    console.log("\n✅ TERMINADO. Ahora intenta iniciar sesión.");
}

main();

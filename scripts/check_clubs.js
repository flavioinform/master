
import { createClient } from '@supabase/supabase-client'
import fs from 'fs'

const supabaseUrl = 'https://your-url.supabase.co'
const supabaseKey = 'your-key'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTable() {
    const { data, error } = await supabase.from('clubs').select('*').limit(1)
    if (error) {
        console.error('Error or table does not exist:', error.message)
    } else {
        console.log('Table exists, data:', data)
    }
}

checkTable()

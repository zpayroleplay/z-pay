// Este archivo conecta Z-Pay con Supabase
// Importamos la librería de Supabase desde internet
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Estos son los datos de TU proyecto en Supabase
const SUPABASE_URL = 'https://otlixpadnxavllcwtmhm.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bGl4cGFkbnhhdmxsY3d0bWhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MzAzMTMsImV4cCI6MjA4NTMwNjMxM30.tDGCRZct3_jJqyZEEfKe_K2OKE_f6mbCLBYjf7pwO44'

// Creamos la conexión y la exportamos para usarla en otros archivos
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
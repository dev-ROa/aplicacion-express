import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Database } from 'bun:sqlite' // Integración nativa de Bun con SQLite, muy eficiente.

// Crea o abre el archivo de base de datos local
const db = new Database('./base.sqlite3')

// --- BASE DE DATOS ---
// Inicialización de tablas: Se asegura de que existan para no tener errores al iniciar.
db.run(`CREATE TABLE IF NOT EXISTS todos 
    (id INTEGER PRIMARY KEY AUTOINCREMENT, todo TEXT NOT NULL)`)
    
db.run(`CREATE TABLE IF NOT EXISTS logs 
    (id INTEGER PRIMARY KEY AUTOINCREMENT, accion TEXT, detalle TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`)

const app = new Hono()
// Habilita el acceso desde otras fuentes (muy importante para apps móviles/React Native)
app.use('/*', cors())

// 1. RUTA DE SALUD: Vital para verificar que el servidor levantó correctamente
app.get('/', (c) => {
    return c.json({ status: 'ok', mensaje: 'API de Android funcionando al 100%' })
})

// 2. RUTA DE LECTURA (GET): .all() ejecuta la query y devuelve todos los resultados como un arreglo
app.get('/tareas', (c) => c.json(db.prepare('SELECT * FROM todos').all()))

app.get('/ver_logs', (c) => c.json(db.prepare('SELECT * FROM logs ORDER BY created_at DESC').all()))

// 3. RUTA DE CREACIÓN (POST):
app.post('/agrega_todo', async (c) => {
    const { todo } = await c.req.json() // Extrae el JSON enviado desde Android/Expo
    // .run() ejecuta la inserción y devuelve el ID recién creado (lastInsertRowid)
    const result = db.prepare('INSERT INTO todos (todo) VALUES (?)').run(todo)
    db.prepare('INSERT INTO logs (accion, detalle) VALUES (?, ?)').run('CREADO', todo)
    return c.json({ id: result.lastInsertRowid }, 201) // 201 es el código HTTP de "Creado"
})

// 4. RUTA DE BORRADO (DELETE):
app.delete('/borrar_todo/:id', (c) => {
    const id = c.req.param('id') // Captura el ID desde la URL dinámica
    const tarea = db.prepare('SELECT todo FROM todos WHERE id = ?').get(id) // Primero buscamos si existe
    if (tarea) {
        db.prepare('DELETE FROM todos WHERE id = ?').run(id)
        db.prepare('INSERT INTO logs (accion, detalle) VALUES (?, ?)').run('BORRADO', `Eliminó: ${tarea.todo}`)
    }
    return c.json({ mensaje: "OK" })
})

app.post('/log_accion', async (c) => {
    const { accion, detalle } = await c.req.json()
    db.prepare('INSERT INTO logs (accion, detalle) VALUES (?, ?)').run(accion, detalle)
    return c.json({ status: 'ok' }, 201)
})

// CONFIGURACIÓN FINAL:
export default {
    port: process.env.PORT || 3000, // Usa el puerto del sistema o el 3000 por defecto
    fetch: app.fetch, // Conecta el router de Hono con el servidor de Bun
}

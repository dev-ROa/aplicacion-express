import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Database } from 'bun:sqlite'

const db = new Database('./base.sqlite3')

// --- BASE DE DATOS ---
db.run(`CREATE TABLE IF NOT EXISTS todos 
    (id INTEGER PRIMARY KEY AUTOINCREMENT, todo TEXT NOT NULL)`)
    
db.run(`CREATE TABLE IF NOT EXISTS logs 
    (id INTEGER PRIMARY KEY AUTOINCREMENT, accion TEXT, detalle TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`)

const app = new Hono()
app.use('/*', cors())

// 1. LA SOLUCIÓN AL 404 EN EL NAVEGADOR
app.get('/', (c) => {
    return c.json({ status: 'ok', mensaje: 'API de Android funcionando al 100%' })
})

// 2. LAS RUTAS QUE EXPO NECESITA PARA FUNCIONAR
app.get('/tareas', (c) => c.json(db.prepare('SELECT * FROM todos').all()))

app.get('/ver_logs', (c) => c.json(db.prepare('SELECT * FROM logs ORDER BY created_at DESC').all()))

app.post('/agrega_todo', async (c) => {
    const { todo } = await c.req.json()
    const result = db.prepare('INSERT INTO todos (todo) VALUES (?)').run(todo)
    db.prepare('INSERT INTO logs (accion, detalle) VALUES (?, ?)').run('CREADO', todo)
    return c.json({ id: result.lastInsertRowid }, 201)
})

app.delete('/borrar_todo/:id', (c) => {
    const id = c.req.param('id')
    const tarea = db.prepare('SELECT todo FROM todos WHERE id = ?').get(id)
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

export default {
    port: process.env.PORT || 3000,
    fetch: app.fetch,
}
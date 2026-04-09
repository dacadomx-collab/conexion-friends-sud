/**
 * Base URL para todas las llamadas a la API PHP.
 *
 * IMPORTANTE — output: 'export' bake esta variable en el JS compilado.
 * Debe apuntar al dominio de producción en .env.local antes de cada build:
 *   NEXT_PUBLIC_API_URL=https://friends.tecnidepot.com
 *
 * Resultado en producción: fetch("https://friends.tecnidepot.com/api/login.php")
 * Misma URL desde cualquier entorno → sin ambigüedad, sin rutas relativas rotas.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

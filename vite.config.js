import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: './' hace que los archivos generados usen rutas relativas, para
// que funcionen sin importar si el sitio queda publicado en la raíz del
// dominio o en una subcarpeta como https://usuario.github.io/retal-zippers/
export default defineConfig({
  plugins: [react()],
  base: './',
})

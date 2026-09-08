# RETAL — Control de merma e inventario textil (Zippers)

Versión funcional de RETAL: la misma lógica del prototipo (registro de
corte, indicadores de planta y analista de merma), pero con los datos
guardados en una base de datos real (Firebase) para que varios
computadores —operario en planta, jefe de producción, analista— vean y
actualicen la misma información en tiempo real.

## 1. Crear el proyecto de Firebase (una sola vez)

1. Entra a https://console.firebase.google.com con una cuenta de Google
   (puede ser una cuenta de la empresa) y crea un proyecto nuevo. El plan
   gratuito "Spark" alcanza sin problema para esta app.
2. Dentro del proyecto: ícono **Agregar app > web (`</>`)**. Ponle un
   nombre (ej. `retal-zippers`) y créala. Firebase te va a mostrar un
   bloque de código con un objeto `firebaseConfig`.
3. Copia esos valores dentro de `src/firebase.js`, reemplazando los que
   dicen `REEMPLAZA_...`.
4. En el menú lateral del proyecto:
   - **Firestore Database** → "Crear base de datos" → modo producción →
     elige la región más cercana (ej. `southamerica-east1`).
   - **Authentication** → pestaña "Sign-in method" → habilita el
     proveedor **Anonymous**. Esto permite que cualquiera con el enlace
     entre sin usuario ni contraseña, pero sigue exigiendo pasar por la
     app (no por internet en general).
5. En Firestore, pestaña **Reglas**, reemplaza el contenido por esto y
   publica:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

## 2. Correrlo en tu computador

```bash
npm install
npm run dev
```

Abre la URL que muestra la terminal (normalmente `http://localhost:5173`).
Prueba a abrir esa misma URL en dos pestañas o dos computadores de la
misma red: registrar una orden en una debe reflejarse al instante en la
otra.

## 3. Publicarlo en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `retal-zippers`) y
   súbele este proyecto:

   ```bash
   git init
   git add .
   git commit -m "Primera versión de RETAL"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/retal-zippers.git
   git push -u origin main
   ```

2. Publica:

   ```bash
   npm run deploy
   ```

   Esto genera la carpeta `dist/` y la sube a una rama `gh-pages` del
   repositorio.

3. En GitHub: **Settings → Pages → Build and deployment → Source:
   "Deploy from a branch"**, elige la rama `gh-pages` y carpeta `/ (root)`.
   En un par de minutos la app queda publicada en
   `https://TU_USUARIO.github.io/retal-zippers/`.

4. Cada vez que hagas cambios: `npm run deploy` vuelve a publicar la
   última versión (no hace falta tocar la configuración de nuevo).

## Qué cambia frente al prototipo original

- **Los datos se guardan de verdad** en Firestore: cerrar la pestaña o
  apagar el computador no borra nada.
- **Se comparten en vivo**: todos los que abran el enlace ven las mismas
  órdenes, rollos y remanentes, actualizados al instante.
- **Las referencias (productos) se administran desde la app**, en la
  pestaña "Jefe de producción" → "Referencias / productos" — no vienen
  de datos de ejemplo inventados, hay que cargar las reales de Zippers
  la primera vez.
- **El analista sigue siendo local**: el diagnóstico y las conclusiones
  se calculan con reglas de JavaScript sobre los datos reales, sin
  llamar a ningún servicio externo (por eso no necesita conexión aparte
  de cargar la página, ni tiene costo por uso).

## Qué falta si más adelante quieren reforzar seguridad

Ahora mismo cualquiera con el enlace puede leer y escribir datos (solo
se le exige "estar autenticado", pero la autenticación es anónima y
automática). Si más adelante quieren que cada persona inicie sesión con
su usuario y que, por ejemplo, un operario no pueda editar referencias,
se puede agregar login con correo/contraseña de Firebase Authentication
y ajustar las reglas de Firestore según el rol. Aviso si lo necesitan y
lo agregamos.

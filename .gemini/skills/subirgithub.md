# Skill: subirgithub

Esta skill automatiza el proceso de subir los cambios locales al repositorio de GitHub.

## Comandos
```powershell
npm run subir
```

## Descripción
Realiza las siguientes acciones secuencialmente:
1. `git add .`: Prepara todos los archivos nuevos y modificados (incluyendo los de la PWA).
2. `git commit -m "..."`: Crea un commit con un mensaje descriptivo.
3. `git push`: Sube los cambios a la rama principal en GitHub.

## Uso
Simplemente pide "ejecuta la skill subir github" o ejecuta `npm run subir` desde la terminal.

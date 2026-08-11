# The Angle 

The Angle is a static editorial website with a small Node.js local server for admin content editing.

The public pages are plain HTML, CSS, and JavaScript. The admin dashboard writes article content to JSON files under `data/`, so the project can be hosted as a static website while still allowing local content updates.

## Quick Start

Requirements:

- Node.js 18 or newer
- Git

Run the project from the project root:

```powershell
cd C:\Users\zamon\Downloads\The_Angle_
npm.cmd start
```

Then open:

```text
http://127.0.0.1:8000/Admin.html
```

The public home page is available at:

```text
http://127.0.0.1:8000/
```

On Windows, use `npm.cmd start` if PowerShell blocks `npm start`.

## Common Issues

### Port 8000 Is Already In Use

If you see `EADDRINUSE: address already in use 127.0.0.1:8000`, the site is already running or another app is using the port.

Try opening:

```text
http://127.0.0.1:8000/Admin.html
```

To check which process owns the port:

```powershell
netstat -ano -p tcp | findstr :8000
```

### npm Cannot Find package.json

Run npm from the project root:

```powershell
cd C:\Users\zamon\Downloads\The_Angle_
```

The project root is the folder that contains `package.json` and `server.js`.

### Git Dubious Ownership Warning

If Git says the folder has dubious ownership, mark this project folder as safe:

```powershell
git config --global --add safe.directory C:/Users/zamon/Downloads/The_Angle_
```

## Git Remote

The current remote should be:

```text
https://github.com/The-Angle/TheAngle.git
```

Useful commands:

```powershell
git remote -v
git status
git add .
git commit -m "Update project"
git push
```

If GitHub already has commits that are not in your local folder, pull first:

```powershell
git pull origin main --allow-unrelated-histories --no-edit
git push -u origin main
```
## Live Link

https://theangle.co.za/ 

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) explains the technical structure.
- [docs/CONTENT_WORKFLOW.md](docs/CONTENT_WORKFLOW.md) explains how content moves through the admin dashboard and JSON files.

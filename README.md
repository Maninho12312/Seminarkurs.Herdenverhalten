# Social Media Feed Experiment

Eine Webanwendung für ein Schulexperiment zur Untersuchung von Herdenverhalten auf Social Media.

## Features

- Vertikaler Feed mit Posts und Kommentaren
- Likes für Posts und Kommentare
- Admin-Modus für Post-Erstellung und vorgefertigte Kommentare
- Lokale Speicherung für Nutzerdaten und Likes
- Responsive Design

## Technologie-Stack

- **Frontend:** Next.js mit TypeScript und Tailwind CSS
- **Backend:** Node.js mit Express
- **Datenbank:** SQLite
- **Deployment:** Docker

## Lokale Entwicklung

### Voraussetzungen

- Node.js 18+
- npm oder yarn

### Installation

1. Repository klonen
2. Abhängigkeiten installieren:

   ```bash
   cd client
   npm install

   cd ../server
   npm install
   ```

3. Server starten:

   ```bash
   cd server
   npm run dev
   ```

4. Client starten:

   ```bash
   cd client
   npm run dev
   ```

5. Öffne http://localhost:3000 im Browser

## Docker Deployment

1. Docker und Docker Compose installieren
2. `docker-compose up --build` ausführen
3. Client: http://localhost:3000
4. Server: http://localhost:5000

## Admin-Modus

- Klicke auf "Admin" im Header
- Passwort: admin123 (ändere in .env)
- Erstelle Posts mit Text und Bild
- Füge vorgefertigte Kommentare hinzu

## Sicherheit

- Ändere das Admin-Passwort in server/.env
- Verwende HTTPS im Produktion
- Rate Limiting kann hinzugefügt werden

## Deployment auf VPS

1. Server mit Node.js aufsetzen
2. Umgebungsvariablen konfigurieren
3. Nginx als Reverse Proxy
4. SSL-Zertifikat mit Let's Encrypt
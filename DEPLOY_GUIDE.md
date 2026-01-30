# Deploy-guide för Job Hunt App

Här är stegen för att få ut appen på internet.

## 1. Skapa ett GitHub-arkiv
1. Gå till [github.com/new](https://github.com/new).
2. Ge arkivet namnet `job-hunt-app` (eller vad du vill).
3. Kör dessa kommandon i din terminal (jag har redan gjort `git init` och `git commit`):
   ```powershell
   git remote add origin https://github.com/DITT_ANVÄNDARNAMN/DITT_ARKIVNAMN.git
   git branch -M main
   git push -u origin main
   ```

## 2. Deploya Backend (Render.com)
1. Skapa ett konto på [Render.com](https://render.com).
2. Klicka på **New +** > **Web Service**.
3. Koppla ditt GitHub-arkiv.
4. Settings:
   - **Root Directory**: `job-hunt-app/backend`
   - **Environment**: `Docker`
5. När den är klar får du en URL (t.ex. `https://job-hunt-api.onrender.com`).

## 3. Deploya Frontend (Vercel.com)
1. Skapa ett konto på [Vercel.com](https://vercel.com).
2. Klicka på **Add New** > **Project**.
3. Koppla ditt GitHub-arkiv.
4. Settings:
   - **Root Directory**: `job-hunt-app/frontend`
   - **Framework Preset**: `Vite`
5. **Environment Variables**:
   - Lägg till en variabel: `VITE_API_URL`
   - Värde: `https://din-backend-url-från-render.com/api`
6. Klicka på **Deploy**.

Klart! Din app är nu live.

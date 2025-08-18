# Decap Proxy GitHub Apps

[![Netlify Status](https://api.netlify.com/api/v1/badges/7f308f30-275f-4cbe-a22b-0a7762062d88/deploy-status)](https://app.netlify.com/projects/pauseai-cms-proxy/deploys)

> [!WARNING]  
> The application is not meant for external use. We will not answer support requests and might not address issues that don't affect us.

This project serves as a proxy for handling GitHub App authentication, primarily designed to integrate with Decap CMS. It manages the OAuth flow, token exchange, and checks for GitHub App installations to ensure seamless access to GitHub repositories.

## Features

- **GitHub OAuth Flow**: Handles the complete OAuth 2.0 authorization code grant flow with GitHub.
- **Secure Token Handling**: Exchanges authorization codes for access tokens and stores them securely using `httpOnly` cookies.
- **State Management**: Implements state parameter validation to prevent CSRF attacks during the OAuth process.
- **GitHub App Installation Check**: Automatically prompts users to install the associated GitHub App if it's not already installed for the relevant repository or user account, based on required permissions.
- **SvelteKit Frontend**: Built with SvelteKit, providing a modern and efficient web application framework.

## How it Works

1.  **Authorization Request**: When a user initiates authentication (e.g., from Decap CMS), they are redirected to the `/auth` route of this proxy.
2.  **GitHub Redirection**: The `/auth` page generates a unique `state` (UUID) and redirects the user to GitHub's OAuth authorization endpoint, including `client_id`, `redirect_uri`, `scope`, and the generated `state`.
3.  **Callback Handling**: After the user authorizes the application on GitHub, GitHub redirects back to the `/callback` route of this proxy with a `code` and the original `state`.
4.  **Token Exchange**: The `/callback` route validates the `state` parameter against the stored cookie and then makes a server-side request to GitHub to exchange the `code` for an `access_token`. This token is then stored in an `httpOnly` cookie.
5.  **Installation Check**: The proxy uses the obtained access token to check if the GitHub App is installed for the target repository or user. If not, the installation is prompted in the following cases:
    - The user is an admin of the target repository which enables them to install the app to the repository.
    - The user **doesn't** have the permission to write to the target repository. This makes it necessary to install the app to the users account so Decap CMS is able to fork the target repository and write to the forked repository.
6.  **Post-Authentication**: Once authentication and potential installation are complete, the `/installed` page retrieves the access token and sends it back to Decap CMS using `window.postMessage`.

## Project Structure

- `src/routes/api/state/+server.ts`: API endpoint to generate and set the OAuth `state` cookie.
- `src/routes/api/token/new/+server.ts`: API endpoint to handle the GitHub OAuth callback, validate parameters, fetch the access token, and set the token cookie.
- `src/routes/api/token/stored/+server.ts`: API endpoint to retrieve the stored access token from the cookie.
- `src/routes/auth/+page.svelte`: Svelte page that initiates the GitHub OAuth flow.
- `src/routes/callback/+page.svelte`: Svelte page that handles the GitHub OAuth callback, token exchange, and app installation checks.
- `src/routes/installed/+page.svelte`: Svelte page that signals successful authentication and passes the token back to the referrer.
- `src/lib/utils.ts`: Utility functions, including `extractParams` for parsing URL query parameters.
- `svelte.config.js`: SvelteKit configuration, using the Netlify adapter.
- `vite.config.ts`: Vite configuration for the SvelteKit project.
- `package.json`: Defines project dependencies (SvelteKit, Octokit, Cookie, UUID, etc.) and scripts.

## Setup and Environment Variables

To run this project, you will need to configure several environment variables. These are typically managed in a `.env` file for local development and through your deployment platform for production.

- `PUBLIC_GITHUB_CLIENT_ID`: Your GitHub OAuth App's Client ID (publicly exposed).
- `GITHUB_CLIENT_SECRET`: Your GitHub OAuth App's Client Secret (private, server-side only).
- `PUBLIC_APP_NAME`: The name of your GitHub App (e.g., `my-decap-app`). Used for constructing installation URLs.
- `PUBLIC_GITHUB_REPO`: The target GitHub repository in `owner/repo` format (e.g., `my-org/my-repo`). Used for permission and installation checks.

## Development

1.  **Install dependencies**:
    ```bash
    pnpm install
    ```
2.  **Run the development server**:
    ```bash
    pnpm run dev
    ```
    This will start the SvelteKit development server, usually at `http://localhost:5173`.

## Building and Deployment

The project is configured to be deployed using `@sveltejs/adapter-netlify`.

1.  **Build the project**:

    ```bash
    pnpm run build
    ```

    This will generate the production-ready build in the `build` directory.

2.  **Deploy the project**:
    This project is designed for deployment on Netlify. You can deploy by linking your repository directly to Netlify, or by using the Netlify CLI.

    Refer to the `@sveltejs/adapter-netlify` documentation for more specific deployment instructions and configuration options.

<script lang="ts">
	import { onMount } from 'svelte';
	import { Octokit, RequestError } from 'octokit';
	import * as env from '$env/static/public';
	import { goto } from '$app/navigation';

	const GITHUB_PERMISSION_LEVELS = ['none', 'read', 'write', 'admin'] as const;
	type GithubPermissionLevel = (typeof GITHUB_PERMISSION_LEVELS)[number];

	onMount(async () => {
		const url = new URL(location.href);
		const { code, state } = await checkCodeAndState(url);

		const tokenUrl =
			'/api/token/new' +
			'?' +
			new URLSearchParams({
				code,
				state
			}).toString();
		const token = await (await fetch(tokenUrl)).text();

		// prompt installation if necessary
		const octokit = new Octokit({ auth: token });
		const needToPromptInstallation = await checkNeedToPromptInstallation(octokit);
		if (needToPromptInstallation) {
			location.href = `https://github.com/apps/${env.PUBLIC_APP_NAME}/installations/new`;
			return;
		}

		await goto('/installed');
	});

	/**
	 * Checks if the GitHub App needs to prompt for installation.
	 * This happens if the app is not installed for the origin repository and the user has admin permissions,
	 * or if the user doesn't have write access and the app is not installed for the user's account.
	 * @param octokit - The Octokit instance, authenticated with the user's token.
	 * @returns True if installation prompt is needed, false otherwise.
	 */
	async function checkNeedToPromptInstallation(octokit: Octokit) {
		const repo = env.PUBLIC_GITHUB_REPO;
		const [owner, repository] = repo.split('/');
		const ownerId = (await octokit.rest.users.getByUsername({ username: owner })).data.id;

		const { data } = await octokit.rest.users.getAuthenticated();
		const { login: username, id: userId } = data;

		// install for origin
		const checkAdminLazy = () => checkPermission(octokit, owner, repository, username, 'admin');
		const checkOriginInstallationLazy = () => checkAppInstallation(octokit, ownerId);
		if (!(await checkOriginInstallationLazy()) && (await checkAdminLazy())) {
			console.debug(`not installed for origin and user has admin permissions`);
			return true;
		}

		// install for user account
		const checkWriteLazy = () => checkPermission(octokit, owner, repository, username, 'write');
		const checkUserInstallationLazy = () => checkAppInstallation(octokit, userId);
		if (!(await checkWriteLazy()) && !(await checkUserInstallationLazy())) {
			console.debug(`user doesn't have write access and not installed for user`);
			return true;
		}

		return false;
	}

	/**
	 * Checks if the 'code' and 'state' parameters are present in the URL.
	 * @param url - The URL object to check.
	 * @returns An object containing the code and state.
	 * @throws If 'code' or 'state' is missing.
	 */
	async function checkCodeAndState(url: URL) {
		const code = url.searchParams.get('code');
		const state = url.searchParams.get('state');

		if (!code) throw new Error('Missing code');
		if (!state) throw new Error('Missing state');

		return { code, state };
	}

	/**
	 * Checks if the GitHub App is installed for a specific target ID (user or organization).
	 * @param octokit - The Octokit instance, authenticated with the user's token.
	 * @param checkId - The ID of the user or organization to check for installation.
	 * @returns True if the app is installed for the given ID, false otherwise.
	 */
	async function checkAppInstallation(octokit: Octokit, checkId: number) {
		console.debug('checkAppInstallation');
		const response = await octokit.rest.apps.listInstallationsForAuthenticatedUser();
		const installations = response.data.installations;
		console.debug('installations', JSON.stringify(installations));
		return installations.some((installation) => installation.target_id == checkId);
	}

	/**
	 * Checks if the authenticated user has a specific permission level for a given repository.
	 * @param octokit - The Octokit instance, authenticated with the user's token.
	 * @param owner - The owner of the repository.
	 * @param repository - The name of the repository.
	 * @param username - The username of the collaborator to check.
	 * @param requiredPermissionLevel - The minimum required permission level ('none', 'read', 'write', 'admin').
	 * @returns True if the user has the specified permission level or higher, false otherwise.
	 */
	async function checkPermission(
		octokit: Octokit,
		owner: string,
		repository: string,
		username: string,
		requiredPermissionLevel: GithubPermissionLevel
	) {
		try {
			const { data } = await octokit.rest.repos.getCollaboratorPermissionLevel({
				owner,
				repo: repository,
				username
			});
			const { permission } = data;
			// type widening
			const permissionLevels: readonly string[] = GITHUB_PERMISSION_LEVELS;
			return (
				permissionLevels.indexOf(permission) >=
				GITHUB_PERMISSION_LEVELS.indexOf(requiredPermissionLevel)
			);
		} catch (error: unknown) {
			// not a collaborator or not installed
			if (error instanceof RequestError && (error.status === 404 || error.status == 403)) {
				return false;
			} else {
				throw error;
			}
		}
	}
</script>

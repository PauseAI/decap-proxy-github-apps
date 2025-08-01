<script lang="ts">
	import { onMount } from 'svelte';
	import * as env from '$env/static/public';

	const SCOPE = 'repo,user';

	onMount(async () => {
		sessionStorage.setItem('referrer', document.referrer);

		const state = await (await fetch('/api/state')).text();

		// Environment variables
		const clientId = env['PUBLIC_GITHUB_CLIENT_ID']!;

		// Construct the GitHub OAuth URL
		const url = new URL('https://github.com/login/oauth/authorize');
		url.search =
			'?' +
			new URLSearchParams({
				client_id: clientId,
				redirect_uri: location.origin + '/callback',
				scope: SCOPE,
				response_type: 'code',
				state: state
			}).toString();
		location.href = url.toString();
	});
</script>

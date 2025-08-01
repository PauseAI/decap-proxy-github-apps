<script lang="ts">
	import { onMount } from 'svelte';

	onMount(async () => {
		const response = await fetch('/api/token/stored');
		if (!response.ok) throw Error(`Failed to fetch token: ${response.statusText}`);
		const token = await response.text();
		const tokenJson = JSON.stringify({ provider: 'github', token });

		const referrer = sessionStorage.getItem('referrer');
		if (!referrer) throw Error('No referrer');
		const referrerUrl = new URL(referrer);
		const referrerOrigin = referrerUrl.origin;

		const receiveMessage = () => {
			window.opener.postMessage(`authorization:github:success:${tokenJson}`, referrerOrigin);
			window.removeEventListener('message', receiveMessage);
		};
		window.addEventListener('message', receiveMessage);
		window.opener.postMessage('authorizing:github', referrerOrigin);
	});
</script>

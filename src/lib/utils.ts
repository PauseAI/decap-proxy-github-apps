/**
 * Extract query parameters from a request into an object.
 *
 * @param request - An HTTP request
 * @returns An object with the query parameters, or an empty object if there are none
 */
export function extractParams(request: Request): Record<string, string | undefined> {
	const url = new URL(request.url);
	const entries = url.searchParams.entries();
	const params = Object.fromEntries(entries);
	return params;
}

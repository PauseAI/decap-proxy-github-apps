import { StatusCodes } from 'http-status-codes';
import cookie from 'cookie';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { extractParams } from '$lib/utils';

type ValidationResult<T = object> =
	| ({ success: true } & T)
	| { success: false; errorResponse: Response };

type ParameterValidationResult = ValidationResult<{
	nonNullCode: string;
	nonNullState: string;
}>;

export async function GET({ request }) {
	const { code, state } = extractParams(request);
	const { state: stateCookie } = cookie.parse(request.headers.get('Cookie') ?? '');

	const parameterValidation = validateParams(code, state);
	if (!parameterValidation.success) return parameterValidation.errorResponse;
	const { nonNullCode, nonNullState } = parameterValidation;

	const stateValidation = validateState(nonNullState, stateCookie);
	if (!stateValidation.success) return stateValidation.errorResponse;

	const accessToken = await fetchAccessToken(nonNullCode);

	return new Response(accessToken, {
		headers: {
			'Set-Cookie': cookie.serialize('token', accessToken, {
				httpOnly: true,
				secure: import.meta.env.PROD,
				sameSite: true
			})
		}
	});
}

/**
 * Validates the presence of 'code' and 'state' parameters.
 * @param code - The authorization code from the request.
 * @param state - The state parameter from the request.
 * @returns A ValidationResult indicating success and including the validated (not null) parameters or including an error response.
 */
function validateParams(
	code: string | undefined,
	state: string | undefined
): ParameterValidationResult {
	if (!code) {
		return {
			success: false,
			errorResponse: new Response('Missing authorization code', { status: StatusCodes.BAD_REQUEST })
		};
	}
	if (!state) {
		return {
			success: false,
			errorResponse: new Response('Missing state parameter', { status: StatusCodes.BAD_REQUEST })
		};
	}
	return { success: true, nonNullCode: code, nonNullState: state };
}

/**
 * Validates the 'state' parameter against the 'state' cookie to prevent CSRF attacks.
 * @param state - The state parameter from the request.
 * @param stateCookie - The state cookie from the request headers.
 * @returns A ValidationResult indicating success or including an error response.
 */
function validateState(state: string, stateCookie: string | undefined): ValidationResult {
	if (!stateCookie) {
		return {
			success: false,
			errorResponse: new Response('Missing state cookie', { status: StatusCodes.UNAUTHORIZED })
		};
	}
	if (state != stateCookie) {
		return {
			success: false,
			errorResponse: new Response('State mismatch', { status: StatusCodes.UNAUTHORIZED })
		};
	}
	return { success: true };
}

/**
 * Fetches an access token from GitHub using the provided authorization code.
 * @param code - The authorization code received from GitHub.
 * @returns The access token.
 * @throws If the request to GitHub fails.
 */
async function fetchAccessToken(code: string): Promise<string> {
	const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			client_id: publicEnv.PUBLIC_GITHUB_CLIENT_ID,
			client_secret: privateEnv.GITHUB_CLIENT_SECRET,
			code
		})
	});
	if (!tokenResponse.ok) {
		throw new Error('Failed to fetch access token');
	}
	const { access_token } = await tokenResponse.json();
	return access_token;
}

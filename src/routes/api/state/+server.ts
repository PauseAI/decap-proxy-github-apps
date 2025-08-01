import * as uuid from 'uuid';
import cookie from 'cookie';

export function GET() {
	const state = uuid.v4();
	const stateCookie = cookie.serialize('state', state, {
		httpOnly: true,
		secure: import.meta.env.PROD,
		sameSite: true
	});
	return new Response(state, {
		headers: {
			'Set-Cookie': stateCookie
		}
	});
}

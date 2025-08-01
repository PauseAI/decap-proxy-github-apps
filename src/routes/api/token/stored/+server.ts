import cookie from 'cookie';
import { StatusCodes } from 'http-status-codes';

export function GET({ request }) {
	const { token } = cookie.parse(request.headers.get('Cookie') ?? '');
	if (!token) return new Response(null, { status: StatusCodes.BAD_REQUEST });
	return new Response(token);
}

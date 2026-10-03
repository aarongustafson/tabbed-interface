import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const types = new Map([
	['.css', 'text/css'],
	['.html', 'text/html'],
	['.js', 'text/javascript'],
	['.json', 'application/json'],
]);

createServer(async (request, response) => {
	const pathname = new URL(request.url, 'http://localhost').pathname;
	const requestedPath = resolve(root, `.${pathname}`);

	if (requestedPath !== root && !requestedPath.startsWith(`${root}${sep}`)) {
		response.writeHead(403).end();
		return;
	}

	try {
		const file = await stat(requestedPath);
		if (!file.isFile()) {
			response.writeHead(404).end();
			return;
		}

		response.writeHead(200, {
			'access-control-allow-origin': '*',
			'content-type':
				types.get(extname(requestedPath)) || 'application/octet-stream',
		});
		createReadStream(requestedPath).pipe(response);
	} catch {
		response.writeHead(404).end();
	}
}).listen(4173, '127.0.0.1');

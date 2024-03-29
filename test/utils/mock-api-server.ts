import { Server, createServer } from 'http';
import { parse } from 'url';
import stoppable from 'stoppable';

type MockRoute = {
  path: string;
  statusCode?: number;
  body: string;
};

class MockAPIServer {
  private readonly server: Server & { stop: (_: () => void) => void };

  public constructor(routes: MockRoute[]) {
    const server = createServer((req, res): void => {
      if (!req.url) {
        res.statusCode = 500;
        res.end();
        return;
      }

      const parsedUrl = parse(req.url, true);
      const routeMatch = routes.find((r) => r.path === parsedUrl.pathname);

      if (!routeMatch) {
        res.statusCode = 404;
        res.end();
      } else {
        res.statusCode = routeMatch.statusCode ?? 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(routeMatch.body);
      }
    });

    stoppable(server);
    this.server = server as Server & { stop: (_: () => void) => void };
  }

  public start(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(port, (): void => {
        resolve();
      });
    });
  }

  public dispose(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.server.stop(() => resolve());
    });
  }
}

export default MockAPIServer;

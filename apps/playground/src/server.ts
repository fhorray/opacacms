import { createNodeServer } from 'opacacms/server';
import config from './opacacms.config';

const { start } = createNodeServer(config);


// API only - admin UI is a separate frontend app
start({ port: 3000 });

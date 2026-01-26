import { createWorkersHandler } from 'opacacms/server';

const { start } = createWorkersHandler();

export default start({ port: 3000 });

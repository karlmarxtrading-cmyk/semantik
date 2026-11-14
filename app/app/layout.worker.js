import {analyzeLayout} from './layout.js';
self.onmessage = ({data}) => {
  try { self.postMessage({result: analyzeLayout(data.items, data.options)}); }
  catch (error) { self.postMessage({error: String(error.message || error)}); }
};

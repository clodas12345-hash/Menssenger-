const React = require('react');
const ReactDOMServer = require('react-dom/server');
console.log(ReactDOMServer.renderToString(React.createElement('span', null, NaN, '/176')));

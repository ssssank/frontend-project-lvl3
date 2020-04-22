/* eslint-env browser */

import 'bootstrap/dist/css/bootstrap.min.css';

const form = document.querySelector('form');
const output = document.querySelector('.output');

form.elements.inputRSS.addEventListener('input', (e) => {
  output.innerHTML = e.target.value;
});

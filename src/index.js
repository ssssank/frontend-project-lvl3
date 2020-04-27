/* eslint-disable no-throw-literal */
/* eslint-env browser */

import 'bootstrap/dist/css/bootstrap.min.css';
import { watch } from 'melanke-watchjs';
import _ from 'lodash';
import * as yup from 'yup';

const schema = yup.object().shape({
  rss: yup.string().required().url(),
});

const form = document.querySelector('form');
const output = document.querySelector('.output');

const render = (state) => {
  // form.reset();
  output.nextSibling.innerHTML = '';
  const ul = document.createElement('ul');
  state.feeds.forEach((feed) => {
    const li = document.createElement('li');
    li.append(document.createTextNode(feed));
    ul.append(li);
  });
  output.after(ul);
};

const renderError = (element, error) => {
  const errorElement = element.nextElementSibling;
  if (errorElement) {
    element.classList.remove('is-invalid');
    errorElement.remove();
  }
  console.log(error);
  if (_.isEmpty(error)) {
    return;
  }
  const feedbackElement = document.createElement('div');
  feedbackElement.classList.add('invalid-feedback');
  feedbackElement.innerHTML = error.message;
  element.classList.add('is-invalid');
  element.after(feedbackElement);
};

const app = () => {
  const state = {
    form: {
      processState: 'filling',
      processError: null,
      errors: {},
      feilds: {
        rss: '',
      },
    },
    feeds: [],
  };

  watch(state, 'feeds', () => {
    render(state);
  });

  watch(state.form, 'errors', () => {
    renderError(form.elements.rss, state.form.errors);
  });

  form.elements.rss.addEventListener('input', (e) => {
    state.form.feilds.rss = e.target.value;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.form.processState = 'adding';
    const formData = new FormData(e.target);
    const value = formData.get('rss');
    try {
      schema.validateSync(state.form.feilds, { abortEarly: false });
      if (_.indexOf(state.feeds, state.form.feilds.rss) !== -1) {
        throw { message: 'This feed already in list' };
      }
      state.feeds.push(value);
      state.form.errors = {};
      state.form.processState = 'finished';
    } catch (error) {
      state.form.errors = error;
      state.form.processState = 'failed';
    }
  });

  render(state);
};

app();

/* eslint-disable no-throw-literal */
/* eslint-env browser */

import 'bootstrap/dist/css/bootstrap.min.css';
import { watch } from 'melanke-watchjs';
import _ from 'lodash';
import * as yup from 'yup';
import axios from 'axios';

const routes = {
  corsProxy: (url) => `https://cors-anywhere.herokuapp.com/${url}`,
};

const schema = yup.object().shape({
  rss: yup.string().required().url(),
});

const form = document.querySelector('form');
const output = document.querySelector('.output');

const render = (state) => {
  form.reset();
  if (state.feeds.length === 0) {
    return;
  }
  output.innerHTML = '';
  const ul = document.createElement('ul');
  ul.classList.add('list-group', 'list-group-flush', 'list-group-item-action');
  state.feeds.forEach((feed) => {
    const li = document.createElement('li');
    li.classList.add('list-group-item', 'list-group-item-action');
    axios.get(routes.corsProxy(feed))
      .then((res) => {
        const domparser = new DOMParser();
        const doc = domparser.parseFromString(res.data, 'text/html');
        const title = doc.querySelector('title').innerHTML;
        const description = doc.querySelector('description').innerHTML;
        li.append(document.createTextNode(title));
        li.append(' - ');
        li.append(document.createTextNode(description));
        const posts = doc.querySelectorAll('item');
        console.log(posts);
        posts.forEach((post) => {
          const postTitle = post.querySelector('title').innerHTML;
          const postLink = post.querySelector('link').nextSibling.textContent;
          const div = document.createElement('div');
          const link = document.createElement('a');
          link.innerHTML = postTitle;
          link.href = postLink;
          div.append(link);
          li.append(div);
        });
        ul.append(li);
      })
      .catch((err) => console.log(err));
  });
  output.append(ul);
};

const renderError = (element, error) => {
  const errorElement = element.nextElementSibling;
  if (errorElement) {
    element.classList.remove('is-invalid');
    errorElement.remove();
  }
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

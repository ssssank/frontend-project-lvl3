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

const rssParse = (data) => {
  const rssStream = { posts: [] };
  const domparser = new DOMParser();
  const doc = domparser.parseFromString(data, 'text/html');
  try {
    rssStream.title = doc.querySelector('title').innerHTML;
    rssStream.description = doc.querySelector('description').innerHTML;
    const posts = doc.querySelectorAll('item');
    posts.forEach((post) => {
      rssStream.posts.push({
        postTitle: post.querySelector('title').innerHTML,
        postLink: post.querySelector('link').nextSibling.textContent,
      });
    });
  } catch (error) {
    throw { message: 'This is is not RSS' };
  }
  return rssStream;
};

const render = (state) => {
  form.reset();
  if (state.feeds.length === 0) {
    return;
  }
  const ul = document.createElement('ul');
  ul.classList.add('list-group', 'list-group-flush', 'list-group-item-action');
  state.feeds.forEach((feed) => {
    const li = document.createElement('li');
    li.classList.add('list-group-item', 'list-group-item-action');
    li.append(document.createTextNode(feed.title));
    li.append(' - ');
    li.append(document.createTextNode(feed.description));
    feed.posts.forEach((post) => {
      const div = document.createElement('div');
      const link = document.createElement('a');
      link.innerHTML = post.postTitle;
      link.href = post.postLink;
      div.append(link);
      li.append(div);
    });
    ul.append(li);
  });
  output.innerHTML = '';
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
      schema.validate(state.form.feilds, { abortEarly: false })
        .then(() => {
          if (_.indexOf(state.feeds, state.form.feilds.rss) !== -1) {
            throw { message: 'This feed already in list' };
          }
          axios.get(routes.corsProxy(value))
            .then((res) => {
              try {
                const rssStream = rssParse(res.data);
                state.feeds.push(rssStream);
                state.form.errors = {};
                state.form.processState = 'finished';
              } catch (error) {
                state.form.errors = error;
              }
            });
        })
        .catch((err) => console.log(err));
    } catch (error) {
      state.form.errors = error;
      state.form.processState = 'failed';
    }
  });

  render(state);
};

app();

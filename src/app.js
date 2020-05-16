/* eslint no-param-reassign: "error" */
/* eslint-disable no-return-assign */
/* eslint-env browser */

import 'bootstrap/dist/css/bootstrap.min.css';
import { watch } from 'melanke-watchjs';
import _ from 'lodash';
import * as yup from 'yup';
import axios from 'axios';
import i18next from 'i18next';
import resources from './locales';
import rssParse from './parse';
import { render, renderForm } from './renders';

const requestTimeout = 5000;
const updateInterval = 5000;

i18next.init({
  lng: 'en',
  debug: true,
  resources,
});

const routes = {
  corsProxy: (url) => `https://cors-anywhere.herokuapp.com/${url}`,
};

yup.setLocale({
  string: {
    url: i18next.t('errors.isNotUrl'),
  },
  mixed: {
    required: i18next.t('errors.isRequired'),
  },
});

const schema = yup.object().shape({
  rss: yup.string().required().url(),
});

const updateFeed = (feed, state, lastPubDate) => {
  axios.get(routes.corsProxy(feed.url), { timeout: requestTimeout })
    .then((res) => {
      try {
        const rssStream = rssParse(res.data);
        const { items } = rssStream;
        const posts = items.map((item) => ({
          ...item,
          id: _.uniqueId(),
          feedId: feed.id,
        }));
        posts.map((post) => post.feedId = feed.id);
        const newPosts = posts.filter((post) => post.pubDate > lastPubDate);
        state.posts.unshift(...newPosts);
      } catch (error) {
        console.log(error);
      } finally {
        const newPostPubDate = _.max(state.posts.map(({ pubDate }) => pubDate));
        setTimeout(updateFeed, updateInterval, feed, state, newPostPubDate);
      }
    })
    .catch((error) => {
      console.log(error);
    });
};

export default () => {
  const form = document.querySelector('form');
  const output = document.querySelector('.output');
  const pageTitle = document.querySelector('title');
  const header = document.querySelector('h1');
  const label = document.querySelector('label');

  pageTitle.innerHTML = i18next.t('page.title');
  header.innerHTML = i18next.t('page.header');
  label.innerHTML = i18next.t('page.text');
  form.elements.add.innerHTML = i18next.t('page.button');

  const state = {
    form: {
      processState: 'filling',
      errors: {},
      feilds: {
        rss: '',
      },
    },
    feeds: [],
    posts: [],
  };

  watch(state, 'feeds', () => {
    render(state, output);
  });

  watch(state, 'posts', () => {
    render(state, output);
  });

  watch(state.form, 'processState', () => {
    renderForm(form, state);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.form.processState = 'adding';
    const formData = new FormData(e.target);
    const value = formData.get('rss');
    state.form.feilds.rss = value;
    schema.validate(state.form.feilds, { abortEarly: false })
      .then(() => {
        if (_.findKey(state.feeds, ['url', value])) {
          throw new Error(i18next.t('errors.isLinkDuplication'));
        }
        axios.get(routes.corsProxy(value), { timeout: requestTimeout })
          .then((res) => {
            try {
              const rssStream = rssParse(res.data);
              const { title, description, items } = rssStream;
              const feed = {
                title,
                description,
                url: value,
                id: _.uniqueId(),
              };
              const posts = items.map((item) => ({
                ...item,
                id: _.uniqueId(),
                feedId: feed.id,
              }));
              const maxPubDate = _.max(posts.map(({ pubDate }) => pubDate));
              state.feeds.unshift(feed);
              state.posts.unshift(...posts);
              state.form.errors = {};
              state.form.processState = 'finished';
              setTimeout(updateFeed, updateInterval, feed, state, maxPubDate);
            } catch (error) {
              state.form.errors = error;
              state.form.processState = 'failed';
            }
          })
          .catch((err) => {
            state.form.errors = err;
            state.form.processState = 'failed';
          });
      })
      .catch((err) => {
        state.form.errors = err;
        state.form.processState = 'failed';
      });
  });

  render(state, output);
};

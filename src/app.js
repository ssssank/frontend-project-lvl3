import 'bootstrap/dist/css/bootstrap.min.css';
import _ from 'lodash';
import * as yup from 'yup';
import axios from 'axios';
import i18next from 'i18next';
import resources from './locales';
import rssParse from './parser';
import runWatchers from './watchers';

const requestTimeout = 5000;
const updateInterval = 5000;

const routes = {
  corsProxy: (url) => `https://cors-anywhere.herokuapp.com/${url}`,
};

const updateFeed = (feed, state) => {
  axios.get(routes.corsProxy(feed.url), { timeout: requestTimeout })
    .then((res) => {
      const rssStream = rssParse(res.data);
      const { items } = rssStream;
      const newPosts = items.map((item) => ({
        ...item,
        id: _.uniqueId(),
        feedId: feed.id,
      }));
      const oldPosts = state.posts.filter((post) => post.feedId === feed.id);
      const postToAdd = _.differenceWith(newPosts, oldPosts, (p1, p2) => p1.link === p2.link);
      state.posts.unshift(...postToAdd);
    })
    .finally(() => {
      setTimeout(updateFeed, updateInterval, feed, state);
    });
};

const validateUrl = (feeds, value) => {
  yup.setLocale({
    string: {
      url: i18next.t('errors.isNotUrl'),
    },
    mixed: {
      required: i18next.t('errors.isRequired'),
    },
  });

  const urls = feeds.map((feed) => feed.url);

  const schema = yup.string().required().url().notOneOf(urls, i18next.t('errors.isLinkDuplication'));

  schema.validateSync(value);
};

const getRss = (state, value) => {
  axios.get(routes.corsProxy(value), { timeout: requestTimeout })
    .then((res) => {
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
      state.feeds.unshift(feed);
      state.posts.unshift(...posts);
      state.form.errors = {};
      state.form.processState = 'finished';
      setTimeout(updateFeed, updateInterval, feed, state);
    })
    .catch((err) => {
      state.form.errors = err;
      state.form.processState = 'failed';
    });
};

export default () => {
  i18next.init({
    lng: 'en',
    debug: true,
    resources,
  });

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
    },
    feeds: [],
    posts: [],
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.form.processState = 'adding';
    const formData = new FormData(e.target);
    const value = formData.get('rss');
    try {
      validateUrl(state.feeds, value);
      getRss(state, value);
    } catch (error) {
      state.form.errors = error;
      state.form.processState = 'failed';
    }
  });

  runWatchers(state, form, output);
};

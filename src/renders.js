/* eslint no-param-reassign: "error" */
/* eslint-env browser */

import i18next from 'i18next';

const render = (state, output) => {
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

    const postsForRendering = state.posts.filter(({ feedId }) => feedId === feed.id);

    postsForRendering.forEach((post) => {
      const div = document.createElement('div');
      const link = document.createElement('a');
      link.innerHTML = post.postTitle;
      link.href = post.postLink;
      link.setAttribute('target', '_blank');
      div.append(link);
      li.append(div);
    });
    ul.append(li);
  });
  output.innerHTML = '';
  output.append(ul);
};

const renderHelper = (field, message) => {
  const helperElement = field.nextElementSibling;
  if (helperElement) {
    field.classList.remove('is-invalid');
    helperElement.remove();
  }
  const feedbackElement = document.createElement('div');
  if (message instanceof Error) {
    feedbackElement.classList.add('invalid-feedback');
    field.classList.add('is-invalid');
  } else {
    feedbackElement.classList.add('valid-feedback');
    field.classList.add('is-valid');
  }
  feedbackElement.innerHTML = message;
  field.after(feedbackElement);
};

const renderForm = (form, state) => {
  const field = form.elements.rss;
  const submit = form.elements.add;

  switch (state.form.processState) {
    case 'filling':
      form.reset();
      submit.classList.remove('disabled');
      field.removeAttribute('readonly');
      break;
    case 'adding':
      renderHelper(field, i18next.t('waiting'));
      submit.classList.add('disabled');
      field.setAttribute('readonly', true);
      break;
    case 'failed':
      renderHelper(field, state.form.errors);
      submit.classList.remove('disabled');
      field.removeAttribute('readonly');
      break;
    case 'finished':
      renderHelper(field, i18next.t('success'));
      submit.classList.remove('disabled');
      field.removeAttribute('readonly');
      break;
    default:
      throw new Error(`Unknown form state: '${state.form.processState}'`);
  }
};

export { render, renderForm };

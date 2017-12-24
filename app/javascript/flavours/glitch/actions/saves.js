import api, { getLinks } from 'flavours/glitch/util/api';

export const SAVED_STATUSES_FETCH_REQUEST = 'SAVED_STATUSES_FETCH_REQUEST';
export const SAVED_STATUSES_FETCH_SUCCESS = 'SAVED_STATUSES_FETCH_SUCCESS';
export const SAVED_STATUSES_FETCH_FAIL    = 'SAVED_STATUSES_FETCH_FAIL';

export const SAVED_STATUSES_EXPAND_REQUEST = 'SAVED_STATUSES_EXPAND_REQUEST';
export const SAVED_STATUSES_EXPAND_SUCCESS = 'SAVED_STATUSES_EXPAND_SUCCESS';
export const SAVED_STATUSES_EXPAND_FAIL    = 'SAVED_STATUSES_EXPAND_FAIL';

export function fetchSavedStatuses() {
  return (dispatch, getState) => {
    dispatch(fetchSavedStatusesRequest());

    api(getState).get('/api/v1/saves').then(response => {
      const next = getLinks(response).refs.find(link => link.rel === 'next');
      dispatch(fetchSavedStatusesSuccess(response.data, next ? next.uri : null));
    }).catch(error => {
      dispatch(fetchSavedStatusesFail(error));
    });
  };
};

export function fetchSavedStatusesRequest() {
  return {
    type: SAVED_STATUSES_FETCH_REQUEST,
  };
};

export function fetchSavedStatusesSuccess(statuses, next) {
  return {
    type: SAVED_STATUSES_FETCH_SUCCESS,
    statuses,
    next,
  };
};

export function fetchSavedStatusesFail(error) {
  return {
    type: SAVED_STATUSES_FETCH_FAIL,
    error,
  };
};

export function expandSavedStatuses() {
  return (dispatch, getState) => {
    const url = getState().getIn(['status_lists', 'saves', 'next'], null);

    if (url === null) {
      return;
    }

    dispatch(expandSavedStatusesRequest());

    api(getState).get(url).then(response => {
      const next = getLinks(response).refs.find(link => link.rel === 'next');
      dispatch(expandSavedStatusesSuccess(response.data, next ? next.uri : null));
    }).catch(error => {
      dispatch(expandSavedStatusesFail(error));
    });
  };
};

export function expandSavedStatusesRequest() {
  return {
    type: SAVED_STATUSES_EXPAND_REQUEST,
  };
};

export function expandSavedStatusesSuccess(statuses, next) {
  return {
    type: SAVED_STATUSES_EXPAND_SUCCESS,
    statuses,
    next,
  };
};

export function expandSavedStatusesFail(error) {
  return {
    type: SAVED_STATUSES_EXPAND_FAIL,
    error,
  };
};

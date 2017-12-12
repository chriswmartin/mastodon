import api from 'flavours/glitch/util/api';

export const PINNED_LISTS_FETCH_REQUEST = 'PINNED_LISTS_FETCH_REQUEST';
export const PINNED_LISTS_FETCH_SUCCESS = 'PINNED_LISTS_FETCH_SUCCESS';
export const PINNED_LISTS_FETCH_FAIL = 'PINNED_LISTS_FETCH_FAIL';

export function fetchPinnedLists() {
  return (dispatch, getState) => {
    dispatch(fetchPinnedListsRequest());

    api(getState).get(`/api/v1/lists/${id}`, { params: { pinned: true } }).then(response => {
      dispatch(fetchPinnedListsSuccess(response.data, null));
    }).catch(error => {
      dispatch(fetchPinnedListsFail(error));
    });
  };
};

export function fetchPinnedListsRequest() {
  return {
    type: PINNED_LISTS_FETCH_REQUEST,
  };
};

export function fetchPinnedListsSuccess(lists, next) {
  return {
    type: PINNED_LISTS_FETCH_SUCCESS,
    lists,
    next,
  };
};

export function fetchPinnedListsFail(error) {
  return {
    type: PINNED_LISTS_FETCH_FAIL,
    error,
  };
};

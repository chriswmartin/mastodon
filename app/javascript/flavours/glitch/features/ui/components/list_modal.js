import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import LoadingIndicator from 'flavours/glitch/components/loading_indicator';
import Column from 'flavours/glitch/features/ui/components/column';
import ColumnBackButtonSlim from 'flavours/glitch/components/column_back_button_slim';
import { fetchLists } from 'flavours/glitch/actions/lists';
import { defineMessages, injectIntl } from 'react-intl';
import ImmutablePureComponent from 'react-immutable-pure-component';
import ColumnLink from 'flavours/glitch/features/ui/components/column_link';
import ColumnSubheading from 'flavours/glitch/features/ui/components/column_subheading';
import { createSelector } from 'reselect';
import IconButton from 'flavours/glitch/components/icon_button';

const messages = defineMessages({
  heading: { id: 'column.lists', defaultMessage: 'Lists' },
  subheading: { id: 'lists.subheading', defaultMessage: 'Your lists' },
  add: { id: 'lists.account.add', defaultMessage: 'Add to list' },
});

const getOrderedLists = createSelector([state => state.get('lists')], lists => {
  if (!lists) {
    return lists;
  }

  return lists.toList().filter(item => !!item).sort((a, b) => a.get('title').localeCompare(b.get('title')));
});

const mapStateToProps = state => ({
  lists: getOrderedLists(state),
});

@connect(mapStateToProps)
@injectIntl
export default class Lists extends ImmutablePureComponent {

  static propTypes = {
    params: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired,
    lists: ImmutablePropTypes.list,
    intl: PropTypes.object.isRequired,
  };

  componentWillMount () {
    this.props.dispatch(fetchLists());
  }

  render () {
    const { intl, lists } = this.props;

    if (!lists) {
      return (
        <Column>
          <LoadingIndicator />
        </Column>
      );
    }

    let button;
    button = <IconButton icon='plus' title={intl.formatMessage(messages.add)} />;
    //button = <IconButton icon='plus' title={intl.formatMessage(messages.add)} onClick={onAdd} />;

    return (
      <div className='modal-root__modal boost-modal'>
        <div className='boost-modal__container'>
          <div className='scrollable'>
            {lists.map(list =>
              <ColumnLink key={list.get('id')} to={`/timelines/list/${list.get('id')}`} icon='bars' text={list.get('title')} />
            )}
          </div>
        </div>
      </div>
    );
  }

}


import React from 'react';
import NotificationsContainer from './containers/notifications_container';
import PropTypes from 'prop-types';
import LoadingBarContainer from './containers/loading_bar_container';
import TabsBar from './components/tabs_bar';
import ModalContainer from './containers/modal_container';
import { connect } from 'react-redux';
import { Redirect, withRouter } from 'react-router-dom';
import { isMobile } from 'flavours/glitch/util/is_mobile';
import { debounce } from 'lodash';
import { uploadCompose, resetCompose } from 'flavours/glitch/actions/compose';
import { refreshHomeTimeline } from 'flavours/glitch/actions/timelines';
import { refreshNotifications } from 'flavours/glitch/actions/notifications';
import { clearHeight } from 'flavours/glitch/actions/height_cache';
import { WrappedSwitch, WrappedRoute } from 'flavours/glitch/util/react_router_helpers';
import UploadArea from './components/upload_area';
import ColumnsAreaContainer from './containers/columns_area_container';
import classNames from 'classnames';
import {
  Compose,
  Status,
  GettingStarted,
  PublicTimeline,
  CommunityTimeline,
  AccountTimeline,
  AccountGallery,
  HomeTimeline,
  Followers,
  Following,
  Reblogs,
  Favourites,
  DirectTimeline,
  HashtagTimeline,
  Notifications,
  FollowRequests,
  GenericNotFound,
  FavouritedStatuses,
  Blocks,
  Mutes,
  PinnedStatuses,
} from 'flavours/glitch/util/async-components';
import { HotKeys } from 'react-hotkeys';
import { me } from 'flavours/glitch/util/initial_state';
import { defineMessages, injectIntl } from 'react-intl';

// Dummy import, to make sure that <Status /> ends up in the application bundle.
// Without this it ends up in ~8 very commonly used bundles.
import '../../../glitch/components/status';

const messages = defineMessages({
  beforeUnload: { id: 'ui.beforeunload', defaultMessage: 'Your draft will be lost if you leave Mastodon.' },
});

const mapStateToProps = state => ({
  isComposing: state.getIn(['compose', 'is_composing']),
  hasComposingText: state.getIn(['compose', 'text']) !== '',
  layout: state.getIn(['local_settings', 'layout']),
  isWide: state.getIn(['local_settings', 'stretch']),
  navbarUnder: state.getIn(['local_settings', 'navbar_under']),
});

const keyMap = {
  new: 'n',
  search: 's',
  forceNew: 'option+n',
  focusColumn: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  reply: 'r',
  favourite: 'f',
  boost: 'b',
  mention: 'm',
  open: ['enter', 'o'],
  openProfile: 'p',
  moveDown: ['down', 'j'],
  moveUp: ['up', 'k'],
  back: 'backspace',
  goToHome: 'g h',
  goToNotifications: 'g n',
  goToLocal: 'g l',
  goToFederated: 'g t',
  goToDirect: 'g d',
  goToStart: 'g s',
  goToFavourites: 'g f',
  goToPinned: 'g p',
  goToProfile: 'g u',
  goToBlocked: 'g b',
  goToMuted: 'g m',
  toggleSpoiler: 'x',
};

@connect(mapStateToProps)
@injectIntl
@withRouter
export default class UI extends React.Component {

  static contextTypes = {
    router: PropTypes.object.isRequired,
  };

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    children: PropTypes.node,
    layout: PropTypes.string,
    isWide: PropTypes.bool,
    systemFontUi: PropTypes.bool,
    navbarUnder: PropTypes.bool,
    isComposing: PropTypes.bool,
    hasComposingText: PropTypes.bool,
    location: PropTypes.object,
    intl: PropTypes.object.isRequired,
  };

  state = {
    width: window.innerWidth,
    draggingOver: false,
  };

  handleBeforeUnload = (e) => {
    const { intl, isComposing, hasComposingText } = this.props;

    if (isComposing && hasComposingText) {
      // Setting returnValue to any string causes confirmation dialog.
      // Many browsers no longer display this text to users,
      // but we set user-friendly message for other browsers, e.g. Edge.
      e.returnValue = intl.formatMessage(messages.beforeUnload);
    }
  }

  handleResize = debounce(() => {
    // The cached heights are no longer accurate, invalidate
    this.props.dispatch(clearHeight());

    this.setState({ width: window.innerWidth });
  }, 500, {
    trailing: true,
  });

  handleDragEnter = (e) => {
    e.preventDefault();

    if (!this.dragTargets) {
      this.dragTargets = [];
    }

    if (this.dragTargets.indexOf(e.target) === -1) {
      this.dragTargets.push(e.target);
    }

    if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
      this.setState({ draggingOver: true });
    }
  }

  handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      e.dataTransfer.dropEffect = 'copy';
    } catch (err) {

    }

    return false;
  }

  handleDrop = (e) => {
    e.preventDefault();

    this.setState({ draggingOver: false });

    if (e.dataTransfer && e.dataTransfer.files.length === 1) {
      this.props.dispatch(uploadCompose(e.dataTransfer.files));
    }
  }

  handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();

    this.dragTargets = this.dragTargets.filter(el => el !== e.target && this.node.contains(el));

    if (this.dragTargets.length > 0) {
      return;
    }

    this.setState({ draggingOver: false });
  }

  closeUploadModal = () => {
    this.setState({ draggingOver: false });
  }

  handleServiceWorkerPostMessage = ({ data }) => {
    if (data.type === 'navigate') {
      this.context.router.history.push(data.path);
    } else {
      console.warn('Unknown message type:', data.type);
    }
  }

  componentWillMount () {
    window.addEventListener('beforeunload', this.handleBeforeUnload, false);
    window.addEventListener('resize', this.handleResize, { passive: true });
    document.addEventListener('dragenter', this.handleDragEnter, false);
    document.addEventListener('dragover', this.handleDragOver, false);
    document.addEventListener('drop', this.handleDrop, false);
    document.addEventListener('dragleave', this.handleDragLeave, false);
    document.addEventListener('dragend', this.handleDragEnd, false);

    if ('serviceWorker' in  navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerPostMessage);
    }

    this.props.dispatch(refreshHomeTimeline());
    this.props.dispatch(refreshNotifications());
  }

  componentDidMount () {
    this.hotkeys.__mousetrap__.stopCallback = (e, element) => {
      return ['TEXTAREA', 'SELECT', 'INPUT'].includes(element.tagName);
    };
  }

  shouldComponentUpdate (nextProps) {
    if (nextProps.isComposing !== this.props.isComposing) {
      // Avoid expensive update just to toggle a class
      this.node.classList.toggle('is-composing', nextProps.isComposing);
      this.node.classList.toggle('navbar-under', nextProps.navbarUnder);

      return false;
    }

    // Why isn't this working?!?
    // return super.shouldComponentUpdate(nextProps, nextState);
    return true;
  }

  componentDidUpdate (prevProps) {
    if (![this.props.location.pathname, '/'].includes(prevProps.location.pathname)) {
      this.columnsAreaNode.handleChildrenContentChange();
    }
  }

  componentWillUnmount () {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('dragenter', this.handleDragEnter);
    document.removeEventListener('dragover', this.handleDragOver);
    document.removeEventListener('drop', this.handleDrop);
    document.removeEventListener('dragleave', this.handleDragLeave);
    document.removeEventListener('dragend', this.handleDragEnd);
  }

  setRef = c => {
    this.node = c;
  }

  setColumnsAreaRef = c => {
    this.columnsAreaNode = c.getWrappedInstance().getWrappedInstance();
  }

  handleHotkeyNew = e => {
    e.preventDefault();

    const element = this.node.querySelector('.compose-form__autosuggest-wrapper textarea');

    if (element) {
      element.focus();
    }
  }

  handleHotkeySearch = e => {
    e.preventDefault();

    const element = this.node.querySelector('.search__input');

    if (element) {
      element.focus();
    }
  }

  handleHotkeyForceNew = e => {
    this.handleHotkeyNew(e);
    this.props.dispatch(resetCompose());
  }

  handleHotkeyFocusColumn = e => {
    const index  = (e.key * 1) + 1; // First child is drawer, skip that
    const column = this.node.querySelector(`.column:nth-child(${index})`);

    if (column) {
      const status = column.querySelector('.focusable');

      if (status) {
        status.focus();
      }
    }
  }

  handleHotkeyBack = () => {
    if (window.history && window.history.length === 1) {
      this.context.router.history.push('/');
    } else {
      this.context.router.history.goBack();
    }
  }

  setHotkeysRef = c => {
    this.hotkeys = c;
  }

  handleHotkeyGoToHome = () => {
    this.context.router.history.push('/timelines/home');
  }

  handleHotkeyGoToNotifications = () => {
    this.context.router.history.push('/notifications');
  }

  handleHotkeyGoToLocal = () => {
    this.context.router.history.push('/timelines/public/local');
  }

  handleHotkeyGoToFederated = () => {
    this.context.router.history.push('/timelines/public');
  }

  handleHotkeyGoToDirect = () => {
    this.context.router.history.push('/timelines/direct');
  }

  handleHotkeyGoToStart = () => {
    this.context.router.history.push('/getting-started');
  }

  handleHotkeyGoToFavourites = () => {
    this.context.router.history.push('/favourites');
  }

  handleHotkeyGoToPinned = () => {
    this.context.router.history.push('/pinned');
  }

  handleHotkeyGoToProfile = () => {
    this.context.router.history.push(`/accounts/${me}`);
  }

  handleHotkeyGoToBlocked = () => {
    this.context.router.history.push('/blocks');
  }

  handleHotkeyGoToMuted = () => {
    this.context.router.history.push('/mutes');
  }

  render () {
    const { width, draggingOver } = this.state;
    const { children, layout, isWide, navbarUnder } = this.props;

    const columnsClass = layout => {
      switch (layout) {
      case 'single':
        return 'single-column';
      case 'multiple':
        return 'multi-columns';
      default:
        return 'auto-columns';
      }
    };

    const className = classNames('ui', columnsClass(layout), {
      'wide': isWide,
      'system-font': this.props.systemFontUi,
      'navbar-under': navbarUnder,
    });

    const handlers = {
      new: this.handleHotkeyNew,
      search: this.handleHotkeySearch,
      forceNew: this.handleHotkeyForceNew,
      focusColumn: this.handleHotkeyFocusColumn,
      back: this.handleHotkeyBack,
      goToHome: this.handleHotkeyGoToHome,
      goToNotifications: this.handleHotkeyGoToNotifications,
      goToLocal: this.handleHotkeyGoToLocal,
      goToFederated: this.handleHotkeyGoToFederated,
      goToDirect: this.handleHotkeyGoToDirect,
      goToStart: this.handleHotkeyGoToStart,
      goToFavourites: this.handleHotkeyGoToFavourites,
      goToPinned: this.handleHotkeyGoToPinned,
      goToProfile: this.handleHotkeyGoToProfile,
      goToBlocked: this.handleHotkeyGoToBlocked,
      goToMuted: this.handleHotkeyGoToMuted,
    };

    return (
      <HotKeys keyMap={keyMap} handlers={handlers} ref={this.setHotkeysRef}>
        <div className={className} ref={this.setRef}>
          {navbarUnder ? null : (<TabsBar />)}

          <ColumnsAreaContainer ref={this.setColumnsAreaRef} singleColumn={isMobile(width, layout)}>
            <WrappedSwitch>
              <Redirect from='/' to='/getting-started' exact />
              <WrappedRoute path='/getting-started' component={GettingStarted} content={children} />
              <WrappedRoute path='/timelines/home' component={HomeTimeline} content={children} />
              <WrappedRoute path='/timelines/public' exact component={PublicTimeline} content={children} />
              <WrappedRoute path='/timelines/public/local' component={CommunityTimeline} content={children} />
              <WrappedRoute path='/timelines/direct' component={DirectTimeline} content={children} />
              <WrappedRoute path='/timelines/tag/:id' component={HashtagTimeline} content={children} />

              <WrappedRoute path='/notifications' component={Notifications} content={children} />
              <WrappedRoute path='/favourites' component={FavouritedStatuses} content={children} />
              <WrappedRoute path='/pinned' component={PinnedStatuses} content={children} />

              <WrappedRoute path='/statuses/new' component={Compose} content={children} />
              <WrappedRoute path='/statuses/:statusId' exact component={Status} content={children} />
              <WrappedRoute path='/statuses/:statusId/reblogs' component={Reblogs} content={children} />
              <WrappedRoute path='/statuses/:statusId/favourites' component={Favourites} content={children} />

              <WrappedRoute path='/accounts/:accountId' exact component={AccountTimeline} content={children} />
              <WrappedRoute path='/accounts/:accountId/followers' component={Followers} content={children} />
              <WrappedRoute path='/accounts/:accountId/following' component={Following} content={children} />
              <WrappedRoute path='/accounts/:accountId/media' component={AccountGallery} content={children} />

              <WrappedRoute path='/follow_requests' component={FollowRequests} content={children} />
              <WrappedRoute path='/blocks' component={Blocks} content={children} />
              <WrappedRoute path='/mutes' component={Mutes} content={children} />

              <WrappedRoute component={GenericNotFound} content={children} />
            </WrappedSwitch>
          </ColumnsAreaContainer>

          <NotificationsContainer />
          {navbarUnder ? (<TabsBar />) : null}
          <LoadingBarContainer className='loading-bar' />
          <ModalContainer />
          <UploadArea active={draggingOver} onClose={this.closeUploadModal} />
        </div>
      </HotKeys>
    );
  }

}

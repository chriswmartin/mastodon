import React, { PureComponent } from 'react';
import { ScrollContainer } from 'react-router-scroll-4';
import PropTypes from 'prop-types';
import IntersectionObserverArticleContainer from 'flavours/glitch/containers/intersection_observer_article_container';
import LoadMore from './load_more';
import IntersectionObserverWrapper from 'flavours/glitch/util/intersection_observer_wrapper';
import { throttle } from 'lodash';
import { List as ImmutableList } from 'immutable';
import classNames from 'classnames';
import { attachFullscreenListener, detachFullscreenListener, isFullscreen } from 'flavours/glitch/util/fullscreen';

export default class ScrollableList extends PureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    scrollKey: PropTypes.string.isRequired,
    onScrollToBottom: PropTypes.func,
    onScrollToTop: PropTypes.func,
    onScroll: PropTypes.func,
    trackScroll: PropTypes.bool,
    shouldUpdateScroll: PropTypes.func,
    isLoading: PropTypes.bool,
    hasMore: PropTypes.bool,
    prepend: PropTypes.node,
    emptyMessage: PropTypes.node,
    children: PropTypes.node,
  };

  static defaultProps = {
    trackScroll: true,
  };

  state = {
    lastMouseMove: null,
  };

  intersectionObserverWrapper = new IntersectionObserverWrapper();

  handleScroll = throttle(() => {
    if (this.node) {
      const { scrollTop, scrollHeight, clientHeight } = this.node;
      const offset = scrollHeight - scrollTop - clientHeight;
      this._oldScrollPosition = scrollHeight - scrollTop;

      if (400 > offset && this.props.onScrollToBottom && !this.props.isLoading) {
        this.props.onScrollToBottom();
      } else if (scrollTop < 100 && this.props.onScrollToTop) {
        this.props.onScrollToTop();
      } else if (this.props.onScroll) {
        this.props.onScroll();
      }
    }
  }, 150, {
    trailing: true,
  });

  handleMouseMove = throttle(() => {
    this._lastMouseMove = new Date();
  }, 300);

  handleMouseLeave = () => {
    this._lastMouseMove = null;
  }

  componentDidMount () {
    this.attachScrollListener();
    this.attachIntersectionObserver();
    attachFullscreenListener(this.onFullScreenChange);

    // Handle initial scroll posiiton
    this.handleScroll();
  }

  componentDidUpdate (prevProps) {
    const someItemInserted = React.Children.count(prevProps.children) > 0 &&
      React.Children.count(prevProps.children) < React.Children.count(this.props.children) &&
      this.getFirstChildKey(prevProps) !== this.getFirstChildKey(this.props);

    // Reset the scroll position when a new child comes in in order not to
    // jerk the scrollbar around if you're already scrolled down the page.
    if (someItemInserted && this._oldScrollPosition && this.node.scrollTop > 0) {
      const newScrollTop = this.node.scrollHeight - this._oldScrollPosition;

      if (this.node.scrollTop !== newScrollTop) {
        this.node.scrollTop = newScrollTop;
      }
    } else {
      this._oldScrollPosition = this.node.scrollHeight - this.node.scrollTop;
    }
  }

  componentWillUnmount () {
    this.detachScrollListener();
    this.detachIntersectionObserver();
    detachFullscreenListener(this.onFullScreenChange);
  }

  onFullScreenChange = () => {
    this.setState({ fullscreen: isFullscreen() });
  }

  attachIntersectionObserver () {
    this.intersectionObserverWrapper.connect({
      root: this.node,
      rootMargin: '300% 0px',
    });
  }

  detachIntersectionObserver () {
    this.intersectionObserverWrapper.disconnect();
  }

  attachScrollListener () {
    this.node.addEventListener('scroll', this.handleScroll);
  }

  detachScrollListener () {
    this.node.removeEventListener('scroll', this.handleScroll);
  }

  getFirstChildKey (props) {
    const { children } = props;
    let firstChild = children;
    if (children instanceof ImmutableList) {
      firstChild = children.get(0);
    } else if (Array.isArray(children)) {
      firstChild = children[0];
    }
    return firstChild && firstChild.key;
  }

  setRef = (c) => {
    this.node = c;
  }

  handleLoadMore = (e) => {
    e.preventDefault();
    this.props.onScrollToBottom();
  }

  _recentlyMoved () {
    return this._lastMouseMove !== null && ((new Date()) - this._lastMouseMove < 600);
  }

  render () {
    const { children, scrollKey, trackScroll, shouldUpdateScroll, isLoading, hasMore, prepend, emptyMessage } = this.props;
    const { fullscreen } = this.state;
    const childrenCount = React.Children.count(children);

    const loadMore     = (hasMore && childrenCount > 0) ? <LoadMore visible={!isLoading} onClick={this.handleLoadMore} /> : null;
    let scrollableArea = null;

    if (isLoading || childrenCount > 0 || !emptyMessage) {
      scrollableArea = (
        <div className={classNames('scrollable', { fullscreen })} ref={this.setRef} onMouseMove={this.handleMouseMove} onMouseLeave={this.handleMouseLeave}>
          <div role='feed' className='item-list'>
            {prepend}

            {React.Children.map(this.props.children, (child, index) => (
              <IntersectionObserverArticleContainer
                key={child.key}
                id={child.key}
                index={index}
                listLength={childrenCount}
                intersectionObserverWrapper={this.intersectionObserverWrapper}
                saveHeightKey={trackScroll ? `${this.context.router.route.location.key}:${scrollKey}` : null}
              >
                {child}
              </IntersectionObserverArticleContainer>
            ))}

            {loadMore}
          </div>
        </div>
      );
    } else {
      scrollableArea = (
        <div className='empty-column-indicator' ref={this.setRef}>
          {emptyMessage}
        </div>
      );
    }

    if (trackScroll) {
      return (
        <ScrollContainer scrollKey={scrollKey} shouldUpdateScroll={shouldUpdateScroll}>
          {scrollableArea}
        </ScrollContainer>
      );
    } else {
      return scrollableArea;
    }
  }

}

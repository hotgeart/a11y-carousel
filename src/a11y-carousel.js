//@prepros-prepend lib/Array.from.js
//@prepros-prepend lib/Debounce.js
//@prepros-prepend lib/NodeList.forEach.js
//@prepros-prepend lib/Object.assign.js
//@prepros-prepend lib/TinyGesture.js

class A11yCarousel {
  constructor(selector, userSettings) {
    // Default Settings of the Slide show
    const defaultSettings = {
      autoplay: true,
      autoplaySpeed: 7000,
      transitionSpeed: 300,
      arrows: true,
      dots: false,
      sliderIndex: 0,
      width: `auto`,
      height: `auto`,
      gesture: true,
      pauseOnHover: true,
      className: `a11y-carousel`,
      ariaRoledescriptionCarousel: `carousel`,
      ariaRoledescriptionSlide: `slide`,
      ariaLabel: `Slideshow`,
      playText: `Start slide show`,
      pauseText: `Stop slide show`,
      previousText: `Previous`,
      nextText: `Next`,
      ofText: `of`,
      slideText: `Slide`,
      tablistText: `Choose slide to display`
    };

    // Merge the default settings with the user settings
    this.settings = { ...defaultSettings, ...userSettings };

    // Default global variables
    this._selector = selector;
    this._element = document.querySelector(selector);
    this._playId = `${this._selector.slice(1)}-play`;
    this._prevId = `${this._selector.slice(1)}-prev`;
    this._nextId = `${this._selector.slice(1)}-next`;
    this._sliderIndex = this.getSettings().sliderIndex;
    this._wasPlaying = this.getSettings().autoplay;
    this._canAutoSlide = true;
    this._autoPlayInterval = null;

    // if the id doesn't exist we exit
    if(this._element === null) {
      return false;
    }

    if (this.getSettings().transitionSpeed > this.getSettings().autoplaySpeed) {
      throw `a11y Carousel: 🤚 transitionSpeed can be greater than autoplaySpeed`;
    }

    // Create a wrapper for the whole slide show
    const sliderWrapper = document.createElement(`div`);
    sliderWrapper.setAttribute(
      `aria-roledescription`,
      this.getSettings().ariaRoledescription
    );
    sliderWrapper.setAttribute(`aria-label`, this.getSettings().ariaLabel);
    sliderWrapper.classList.add(this.getSettings().className);

    // Move the current HTML for the slide show in the new wrapper
    const sliderSelector = document.querySelector(this._selector);
    sliderSelector.parentNode.insertBefore(sliderWrapper, sliderSelector);
    sliderWrapper.appendChild(sliderSelector);

    // Easy </UL> </LI> selector
    this._slides = sliderWrapper.querySelectorAll(`${this._selector} > div`);

    // Set attribute and size
    this._element.style.position = `relative`;
    this._element.setAttribute(`aria-live`, (this.getSettings().autoplay) ? 'off' : 'polite');
    this.initSlidesSize();

    window.addEventListener(`resize`, () => {
      this.setSize();
    });

    // Set all the slides
    this._slides.forEach((item, index) => {
      item.setAttribute(`id`, `${this._selector.slice(1)}-tabpanel-${index}`);
      item.setAttribute(
        `aria-label`,
        `${index + 1} ${this.getSettings().ofText} ${this._slides.length}`
      );
      item.style.transition = `all ${this.getSettings().transitionSpeed}ms`;
      item.style.opacity = 1;
      item.style.position = `absolute`;
      item.style.top = 0;
      item.style.left = 0;
      item.style.right = 0;
      item.style.display = `none`;

      if (index === this._sliderIndex) {
        item.style.display = `block`;
      }
    });

    /* DOTS */
    if (this.getSettings().dots) {
      // If we've dots (pagination) we need an aria-labelledby and the role tabpanel for each slide
      this._slides.forEach((item, index) => {
        item.setAttribute(
          `aria-labelledby`,
          `${this._selector.slice(1)}-tab-${index}`
        );
        item.setAttribute(`role`, `tabpanel`);
      });

      // Create a wrapper for the dots
      this.dotsWrapper = document.createElement(`div`);
      this.dotsWrapper.classList.add(`dots`);
      this.dotsWrapper.setAttribute(`role`, `tablist`);
      this.dotsWrapper.setAttribute(`aria-label`, this.getSettings().tablistText);
      sliderWrapper.insertAdjacentElement(`afterbegin`, this.dotsWrapper);

      this._slides.forEach((item, index) => {
        // Create a button dot
        const dotButton = document.createElement(`button`);
        dotButton.setAttribute(
          `aria-controls`,
          `${this._selector.slice(1)}-tabpanel-${index}`
        );
        dotButton.setAttribute(`id`, `${this._selector.slice(1)}-tab-${index}`);
        dotButton.setAttribute(`data-slider-id`, index);
        dotButton.setAttribute(`role`, `tab`);
        dotButton.setAttribute(`tabindex`, -1);

        if (index == this._sliderIndex) {
          dotButton.classList.add(`active`);
        }
        // the first one need to be accessible via [TAB]
        if (index == 0) {
          dotButton.setAttribute(`tabindex`, 0);
        }
        dotButton.textContent = `${this.getSettings().slideText} ${index + 1}`;
        this.dotsWrapper.insertAdjacentElement(`beforeend`, dotButton);

        // Event Listeners dots click
        dotButton.addEventListener(`click`, e => {
          this.setSlider(e.target.getAttribute(`data-slider-id`));
        });

        // Event Listeners dots keyboard arrows
        dotButton.addEventListener(`keydown`, e => {
          // ->
          if (e.which == 39) {
            e.preventDefault();
            if (e.currentTarget.nextSibling !== null) {
              e.currentTarget.nextSibling.focus();
              this.setSlider(e.currentTarget.nextSibling.getAttribute(`data-slider-id`));
            }
          }
          // <-
          if (e.which == 37) {
            e.preventDefault();
            if (e.currentTarget.previousSibling !== null) {
              e.currentTarget.previousSibling.focus();
              this.setSlider(e.currentTarget.previousSibling.getAttribute(`data-slider-id`));
            }
          }
          // HOME
          if (e.which == 36) {
            e.preventDefault();
            e.currentTarget.parentNode.childNodes[0].focus();
            this.setSlider(
              e.currentTarget.parentNode.childNodes[0].getAttribute(`data-slider-id`)
            );
          }
          // END
          if (e.which == 35) {
            e.preventDefault();
            e.currentTarget.parentNode.childNodes[
              e.currentTarget.parentNode.childNodes.length - 1
            ].focus();
            this.setSlider(
              e.currentTarget.parentNode.childNodes[
                e.currentTarget.parentNode.childNodes.length - 1
              ].getAttribute(`data-slider-id`)
            );
          }
        });
      });
    } else {
      // If we DON'T have dots (pagination) we need an aria-roledescription and the role group for each slide
      this._slides.forEach((item, index) => {
        item.setAttribute(
          `aria-roledescription`,
          `slide`
        );
        item.setAttribute(`role`, `group`);
      });
    }

    /* ARROWS */
    const prevBtn = document.createElement(`button`);
    const nextBtn = document.createElement(`button`);

    if (this.getSettings().arrows) {
      // Prev settings
      prevBtn.setAttribute(`aria-controls`, this._selector.slice(1));
      prevBtn.textContent = this.getSettings().previousText;
      prevBtn.setAttribute(`id`, this._prevId);
      prevBtn.classList.add(`prev`);

      // Next settings
      nextBtn.setAttribute(`aria-controls`, this._selector.slice(1));
      nextBtn.textContent = this.getSettings().nextText;
      nextBtn.setAttribute(`id`, this._nextId);
      nextBtn.classList.add(`next`);

      // Insert prev and next buttons in the dom
      sliderWrapper.insertAdjacentElement(`afterbegin`, nextBtn);
      sliderWrapper.insertAdjacentElement(`afterbegin`, prevBtn);
    }

    // AutoPlay logic
    const playBtn = document.createElement(`button`);

    if (this.getSettings().autoplay) {
      playBtn.setAttribute(`id`, this._playId);

      this._autoPlayInterval = setInterval(
        this.autoPlay,
        parseInt(this.getSettings().autoplaySpeed)
      );

      if (this.getSettings().autoplay) {
        playBtn.textContent = this.getSettings().pauseText;
        playBtn.classList.add(`playing`);
        sliderWrapper.insertAdjacentElement(`afterbegin`, playBtn);
      } else {
        playBtn.textContent = this.getSettings().playText;
        playBtn.classList.add(`paused`);
      }
    }

    // Event Listeners controls
    document.addEventListener(`click`, debounce ((e) => {
      // play
      if (e.target && e.target.id == this._playId) {
        // Toggle classes for styling
        playBtn.classList.toggle(`playing`);
        playBtn.classList.toggle(`paused`);
        this._element.setAttribute(`aria-live`, (this._element.getAttribute(`aria-live`) == `polite`) ? `off` : `polite`);

        if (this._wasPlaying) {
          playBtn.textContent = this.getSettings().playText;
          this._canAutoSlide = false;
        } else {
          this._canAutoSlide = true;
          playBtn.textContent = this.getSettings().pauseText;
        }
        this._wasPlaying = !this._wasPlaying;
      }
      // prev
      else if (e.target && e.target.id == this._prevId) {
        this.setSlider(parseInt(this._sliderIndex) - 1);
      }
      // next
      else if (e.target && e.target.id == this._nextId) {
        this.setSlider(parseInt(this._sliderIndex) + 1);
      } else {}
    }, 200));

    // Gesture / Touch listener
    if (this.getSettings().gesture) {
      const gesture = new TinyGesture(this._element);
      // next
      gesture.on('swiperight', debounce (() => {
        this.setSlider(parseInt(this._sliderIndex) - 1);
      }, 200));
      // prev
      gesture.on('swipeleft', debounce (() => {
        this.setSlider(parseInt(this._sliderIndex) + 1);
      }, 200));
    }

    // Pause Hover && Focus
    if (this.getSettings().pauseOnHover) {
      sliderWrapper.addEventListener(`mouseenter`, () => {
        this._canAutoSlide = false;
        this._element.setAttribute(`aria-live`, `polite`);
      });
      sliderWrapper.addEventListener(`mouseleave`, () => {
        if (this._wasPlaying) {
          this._canAutoSlide = true;
          this._element.setAttribute(`aria-live`, `off`);
        }
      });

      // when focus on a button (except play/pause) the carousel stop and is "polite"
      const buttons = sliderWrapper.querySelectorAll(`button`);
      buttons.forEach((button, index) => {
        if(button.getAttribute(`id`) !== this._playId) {
          button.addEventListener(`focus`, () => {
            this._canAutoSlide = false;
            this._element.setAttribute(`aria-live`, `polite`);
          });
        }
      });

      sliderWrapper.addEventListener('focusout', (e) => {
        if (!sliderWrapper.contains(e.relatedTarget)) {
          if (this._wasPlaying) {
            this._canAutoSlide = true;
            this._element.setAttribute(`aria-live`, `off`);
          }
        }
      });
    }
  }

  /*
   * Select a slide
   */
  setSlider = debounce ((sliderIndex = 0) => {
    // If last slider, got to the first one
    if (sliderIndex >= this._slides.length) {
      sliderIndex = 0;
    }
    
    // If first slider, got to the last one
    if (sliderIndex < 0) {
      sliderIndex = this._slides.length - 1;
    }
    
    // If current slider do nothing
    if (this._sliderIndex == sliderIndex) {
      return null;
    }

    // Annimation
    const oldIndex = this._sliderIndex;
    const newIndex = sliderIndex;
    this._sliderIndex = sliderIndex;

    this._slides[oldIndex].style.opacity = 0;
    this._slides[oldIndex].style.zIndex = 2;
    this._slides[newIndex].style.zIndex = 1;
    this._slides[newIndex].style.display = `block`;

    // Active class for Dot
    if (this.getSettings().dots) {
      const dots = Array.from(this.dotsWrapper.children);
      dots.forEach(item => {
        if(item.getAttribute(`data-slider-id`) == newIndex) {
          item.classList.add(`active`);
          item.setAttribute(`tabindex`, 0);
        } else {
          item.classList.remove(`active`);          
          item.setAttribute(`tabindex`, -1);
        }
      })
    }

    // When the Annimation is over
    setTimeout(() => {
      this._slides[oldIndex].style.zIndex = 1;
      this._slides[newIndex].style.zIndex = 2;
      this._slides[oldIndex].style.opacity = null;
      this._slides[oldIndex].style.display = `none`;
    }, parseInt(this.getSettings().transitionSpeed) + 100); // Need more time than transitionSpeed to avoid annimation glitches
  }, 200);

  /**
   *  Functionn called before setSize
   *  setSize need the images to be fully loaded
   */
  initSlidesSize = () => {
    const imgs = Array.from(this._element.querySelectorAll(`img`));
    // If there's no imgs or the imgs are cached
    if (imgs.length == 0) {
      this.setSize();
    } else {
      this.setSize();
      // If there's imgs and when need to wait them
      imgs[imgs.length-1].addEventListener('load', () => {
        this.setSize();
      });
    }
  };

  /**
   * Set the size of the container of the slides
   */
  setSize = debounce (() => {
      if (this.getSettings().width !== `auto`) {
        this._element.style.width = this.getSettings().width;
        this._element.style.maxWidth = this.getSettings().width;
        this._element.style.overflowX = `hidden`;
      }
  
      if (this.getSettings().height !== `auto`) {
        this._element.style.height = this.getSettings().height;
        this._element.style.maxHeight = this.getSettings().height;
        this._element.style.overflowY = `hidden`;
      } else {
        this._element.style.height = `${this._slides[this._sliderIndex].offsetHeight}px`;
      }
  }, 100);

  /**
   * function called by the setInterval autoplay
   */
  autoPlay = () => {
    if(this._canAutoSlide) {
      this.setSlider(parseInt(this._sliderIndex) + 1);
    }
  };

  /*
   * Return an Object of the settings
   */
  getSettings = () => {
    return this.settings;
  };
}
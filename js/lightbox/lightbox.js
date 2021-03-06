define([
    'coreJS/adapt',
    '../tiles/tile',
    '../lib/jquery.resize',
    '../lib/jquery.backgroundImage'
], function(Adapt, Tile) {

    var LightboxTile = Tile.extend({
        View: Tile.View.extend({

            _disableAnimations: false,
            _lightboxOpen: false,
            _lightboxId: "",
            _lightboxBackground: false,
            _lightboxFullsize: false,
            _lightboxHasSized: false,
            _lightboxCurrentOffsetTop: 0,
            _lightboxCurrentAvailableHeight: 0,
            _animationDuration: 400,
            _windowDimensions: null,
            _forceResize: true,
            _iOS: /iPad|iPhone|iPod/.test(navigator.platform),

            onInitialize: Backbone.ascend("onInitialize", function() {
                var linkId = this.model.get("_linkId");
                if (!linkId) return;

                if (this._isIE8 || $('html').is(".ie8") || $('html').is(".iPhone.version-7\\.0")) {
                    this._disableAnimations = true;
                }

                this.$el.addClass(linkId);
                this.$el.attr("data-link", linkId);
            }),

            postRender: Backbone.ascend("postRender", function() {
                var linkId = this.model.get("_linkId");
                if (!linkId) return;

                this._onLinkClick = _.bind(this.onLinkClick, this);
                this._onCloseClick = _.bind(this.onCloseClick, this);
                this._resizeLightbox = _.bind(this.resizeLightbox, this);
                this._forceResizeLightbox = _.bind(function() {
                    this._forceResize = true;
                    this.resizeLightbox();
                }, this);
                this._forceResizeLightboxDebounce = _.debounce(this._forceResizeLightbox, 250);

                var $lightboxContainer = this._editorialArticleView.$lightbox;

                this.$("button[data-link]").on("click", this._onLinkClick);
                
                switch (this.model.get("_type")) {
                case "video":
                    this.$(".text").on("click", this._onLinkClick);
                    break;
                case "text":
                case "image":
                    this.$el.on("click", this._onLinkClick);
                    break;
                }

                
                $lightboxContainer.find(".close-button").on("click", this._onCloseClick);

                this.updateProgressBars();

            }),

            onLinkClick: function(event) {
                event.preventDefault();
                if (this._lightboxOpen) return;

                var linkId = this.model.get("_linkId");
                this._editorialArticleView.$("."+linkId).addClass('visited');

                $('video,audio').trigger('pause');

                $(".lightbox-loading .loader-gif").css({
                    "display": "block"
                });
                if (!this._disableAnimations) {
                    $(".lightbox-loading").velocity({"opacity":1},{"duration":0}).show();
                } else {
                    $(".lightbox-loading").css({
                        "display": "block"
                    });
                }

                this._lightboxHasSized = false;
                this._lightboxCurrentOffsetTop = 0;
                this._lightboxCurrentAvailableHeight = 0;

                var $lightboxContainer = this._editorialArticleView.$lightbox;
                var $lightboxPopup = $lightboxContainer.find(".lightbox-popup");
                var $backgroundImage = $lightboxContainer.find(".background-image");
                var $article = $lightboxContainer.find('[name="'+this.model.get("_editorialId")+'"]');
                var $button = $(event.currentTarget);
                
                this._lightboxId = $button.attr("data-link");

                var $linkElement = $lightboxContainer.find("."+this._lightboxId);
                var linkModel = Adapt.findById(this._lightboxId);
                var linkType = linkModel.get("_type");

                this._lightbox = linkModel.get("_lightbox");
                this._lightboxBackground = this._lightbox._background;

                switch (linkType) {
                case "block":
                    $article.css({
                        "display": "block"
                    }).siblings(":not(.background-image)").css({
                        "display": "none"
                    });
                    $linkElement.css({
                        "display": "block"
                    }).siblings().css({
                        "display": "none"
                    });
                    break;
                case "article":
                    $linkElement.css({
                        "display": "block"
                    }).siblings(":not(.background-image)").css({
                        "display": "none"
                    });
                    $linkElement.find(".block").css({
                        "display": "block"
                    });
                    $linkElement.siblings(":not(.background-image)").find(".block").css({
                        "display": "none"
                    });
                    break;
                }

                if (!this._disableAnimations) {
                    $lightboxContainer.css({
                        "opacity": 0,
                        "visibility": "visible"
                    });
                } else {
                    $lightboxContainer.css({
                        "visibility": "hidden"
                    });
                }

                if (this._lightboxBackground) {
                    $lightboxPopup.addClass("has-background");
                    $backgroundImage.find("img").attr("src", this._lightboxBackground._src);
                    $backgroundImage.imageready(_.bind(complete, this), {allowTimeout:false});
                } else {
                    $lightboxPopup.removeClass("has-background");
                    $backgroundImage.find("img").attr("src", "");
                    complete.call(this);
                }

                function complete() {

                    $articleBlockContainer = $lightboxContainer.find(".article-block-container");

                    this._forceResize = true;
                    $(window).resize();
                    $(window).on("resize", this._resizeLightbox);
                    $(window).on("scroll", this._forceResizeLightboxDebounce);

                    this._lightboxOpen = true;

                    _.delay(_.bind(function() {

                        $(".lightbox-loading .loader-gif").css({
                            "display": "none"
                        });

                        this._forceResize = true;
                        this.resizeLightbox();

                        $articleBlockContainer.on("resize", this._forceResizeLightbox);

                        if (!this._disableAnimations) {

                            $lightboxContainer.velocity({
                                "opacity": 1
                            },{
                                "delay": 100,
                                "duration": this._animationDuration,
                                "complete": complete
                            });

                        } else {

                            $lightboxContainer.css({
                                "visibility": "visible"
                            });

                            complete();
                        }                

                        function complete() {
                            Adapt.trigger('popup:opened',$lightboxPopup.find(".popup"));
                            $('body').scrollDisable();
                            $lightboxPopup.find(".popup [tabindex='0']").a11y_focus();
                            $(window).scroll();
                        }

                    }, this), 250);
                }

            },

            resizeLightbox: function() {
                if (!this._lightboxOpen) return;
                if (!this._forceResize && !$(window).haveDimensionsChanged(this._windowDimensions)) return;

                this._windowDimensions = $(window).getDimensions(true);

                this._forceResize = false;

                var $lightboxContainer = this._editorialArticleView.$lightbox;
                var $linkElement = $lightboxContainer.find("."+this._lightboxId);
                var $lightboxPopup = $lightboxContainer.find(".lightbox-popup");
                var $lightboxPopupBackground = $lightboxContainer.find(".lightbox-popup-background");
                var $lightboxPopupInner = $lightboxContainer.find(".lightbox-popup-inner");
                var $backgroundImage = $lightboxContainer.find(".background-image");
                var $backgroundImageTag = $backgroundImage.find("img");

                var linkAreaHeight = $linkElement.outerHeight();
                

                if (this._lightbox._minHeight && this._lightbox._minHeight["_"+Adapt.device.screenSize]) {
                    if (this._lightbox._minHeight["_"+Adapt.device.screenSize] === "100%") {
                        this._lightbox._fullscreen = true;
                    } else {
                        this._lightbox._fullscreen = false;
                        var minHeight = parseInt(this._lightbox._minHeight["_"+Adapt.device.screenSize]);
                        if (minHeight > linkAreaHeight) linkAreaHeight = minHeight;
                    }
                }

                var availableHeight = $(window).height(); //$lightboxContainer.height();
                var navigationHeight = $(".navigation").outerHeight();
                var contentMiddle = (availableHeight) / 2;
                var linkAreaOffsetTop = (contentMiddle - (linkAreaHeight / 2));

                this._lightboxHasSized = true;
                this._lightboxFullsize = false;
                this._lightboxCurrentOffsetTop = linkAreaOffsetTop;
                this._lightboxCurrentAvailableHeight = availableHeight;

                if (availableHeight < linkAreaHeight || this._lightbox._fullscreen || $("html").is(".touch") ) {

                    $lightboxPopupBackground.css({
                        "height": ""
                    });
                    var topOffset = $(window).scrollTop() + "px";
                    if (!this._iOS) topOffset = "0px";
                    $lightboxPopup.css({
                        "top": topOffset,
                        "overflow-y": "auto",
                        "height": "100%"
                    });
                    $lightboxPopupInner.css({
                        "min-height": "100%"
                    });

                    this._lightboxFullsize = true;
                    
                } else {

                    $linkElement.css({
                        "min-height": "100%"
                    })
                    
                    var topOffset = linkAreaOffsetTop + $(window).scrollTop() + "px";
                    if (!this._iOS) topOffset = linkAreaOffsetTop + "px";
                    $lightboxPopup.css({
                        "top": topOffset,
                        "bottom": "",
                        "height": "",
                        "overflow-y": "hidden"
                    });

                    $lightboxPopupInner.css({
                        "min-height": ""
                    });

                    $lightboxPopupBackground.css({
                        "height": linkAreaHeight + "px",
                        "width": "100%"
                    });
                }

                if (this._lightboxBackground) {
                    $backgroundImage.backgroundImage({
                        "size": this._lightboxBackground._size,
                        "position": this._lightboxBackground._position,
                        "restrict": this._lightboxBackground._restrict
                    });
                }

            },

            onCloseClick: function(event) {
                if (!this._lightboxOpen) return;

                this.updateProgressBars();

                if (this._resizeLightbox) $(window).off("resize", this._resizeLightbox);

                $('video,audio').trigger('pause');
                
                this._lightboxOpen = false;
                
                var $lightboxContainer = this._editorialArticleView.$lightbox;
                var $articleBlockContainer = $lightboxContainer.find(".article-block-container");

                $articleBlockContainer.off("resize", this._forceResizeLightbox);
                $(window).off("scroll", this._forceResizeLightboxDebounce);



                if (!this._disableAnimations) {  

                    var $anim = $($lightboxContainer).add($(".lightbox-loading"));

                    $anim.velocity("stop").velocity({
                        "opacity": 0
                    },{
                        "duration": this._animationDuration,
                        "complete": complete
                    });                 

                } else {

                    complete();

                }

                function complete() {

                    $(".lightbox-loading").css({
                        "display": "none"
                    });

                    $lightboxContainer.css({
                        "visibility": ""
                    });

                    Adapt.trigger("close");

                    Adapt.trigger('popup:closed');
                    $('body').scrollEnable();
                }

            },

            updateProgressBars: function() {
                var linkId = this.model.get("_linkId");
                if (!linkId) return;


                var linkModel = Adapt.findById(linkId);
                var componentModels = linkModel.findDescendants("components");
                componentModels = new Backbone.Collection(componentModels.where({
                    "_isAvailable": true
                }));

                var completeComponents = new Backbone.Collection(componentModels.where({
                    _isComplete: true
                }));

                var percentageComplete = 100;
                if (componentModels.length > 0) {
                    percentageComplete = (completeComponents.length / componentModels.length ) * 100;
                }

                if (percentageComplete == 0) {
                    this._editorialArticleView.$("."+linkId).removeClass("complete").addClass('incomplete');
                } else if (percentageComplete > 0 && percentageComplete < 100) {
                    this._editorialArticleView.$("."+linkId).removeClass("incomplete").addClass('partially-complete visited');
                } else if (percentageComplete == 100) {
                    this._editorialArticleView.$("."+linkId).removeClass("incomplete partially-complete").addClass('complete visited');
                }


                this._editorialArticleView.$("."+linkId).addClass()

                this._editorialArticleView.$("."+linkId+" .lightbox-link-progress-bar").css({
                    "width": percentageComplete +"%"
                });

                if (Adapt.course.get("_globals") && Adapt.course.get("_globals")._extensions && Adapt.course.get("_globals")._extensions._editorial) {
                    var ariaLabel = Adapt.course.get("_globals")._extensions._editorial.progressIndicatorBar;
                    var ariaLabelInstructions = Adapt.course.get("_globals")._extensions._editorial.progressIndicatorBarIncompleteInstructions;
                    var $ariaLabel = this._editorialArticleView.$("."+linkId+" .lightbox-link-progress-bar .aria-label");
                    $ariaLabel.html(ariaLabel + " " + percentageComplete + "%. " + (percentageComplete == 100 ? "" : ariaLabelInstructions));
                }
            },

            onResize: Backbone.ascend("onResize", function() {
                if (!this._lightboxOpen) return;
                if (!$(window).haveDimensionsChanged(this._windowDimensions)) return;
                this.resizeLightbox();
            }),

            getCalculatedStyleObject: Backbone.ascend("getCalculatedStyleObject", function(styleObject) {
                var styleObject = this.model.toJSON();
                
                var linkId = this.model.get("_linkId");
                if (!linkId) return;
                
                switch (styleObject._linkStyle) {
                case "title":
                    this.$(".lightbox-link-title").removeClass("display-none")
                    this.$(".lightbox-link-center").addClass("display-none");
                    break;
                case "center":
                    this.$(".lightbox-link-title").addClass("display-none")
                    this.$(".lightbox-link-center").removeClass("display-none");
                    break;
                }
            }),

            onRemove: Backbone.descend("onRemove", function() {
                var linkId = this.model.get("_linkId");
                if (!linkId) return;

                if (this._resizeLightbox) $(window).off("resize", this._resizeLightbox);
                delete this._resizeLightbox;

                var $lightboxContainer = this._editorialArticleView.$lightbox;
                $lightboxContainer.find(".close-button").off("click", this._onCloseClick);
                delete this._onCloseClick;

                this.$("button[data-link]").off("click", this._onLinkClick);
                this.$(".text").off("click", this._onLinkClick);
                delete this._onLinkClick;
            })

        }),

        Model: Tile.Model.extend({

            defaults: Backbone.ascend("defaults", function() {
                return {
                    "_linkId": null,
                    "_linkText": "Link text",
                    "_linkInstruction": "This is the link instruction",
                    "_linkStyle": "title",
                    
                };
            })

        })

    });

    return LightboxTile;

});


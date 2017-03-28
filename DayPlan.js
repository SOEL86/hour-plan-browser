/*jslint node: true, browser: true*/
/*global  $, Draggable, randomColor*/

//Day Plan 1.0
//Day Plan is a scheduling app designed to be immediately, intuitively useful.
//Author: Michael Alex Morley-Clarke
//Date: 21-Mar-12 7:12 pm
"use strict";

var activities = [],
	date;

//the clock object is for visually informing the user how far through the day they are.
var Clock = function () {
	var clock = this,
		
		//percent persecond: number of seconds in a day / 100
		perSecond = 0.02777777777,
		
		clockFace = $("#mc-clock"),
		//currentActivity = $("#mc-current-activity"),
		currentTime = $("#mc-current-time");
	
	//to make the clock easy to read and maintain a sable position, zeros must be added to single digit numbers
	this.checkZero = function (t) {
		if (t < 10) {
			return "0" + t;
		} else {
			return t;
		}
	};
	
	//for converting the 24 hour clock into the 12 hour clock
	this.twelveHour = function (t) {
		if (t > 12) {
			return t - 12;
		} else {
			return t;
		}
	};
	
	//we want to show how many seconds in the day have elapsed
	this.getTotalSeconds = function () {
		date = new Date();
		return date.getSeconds() + (60 * (date.getMinutes()));
	};
	
	//we want to update the clockface:
	this.setTime = function () {
		clockFace.css("height", (this.getTotalSeconds() * perSecond) + "%");
	};
	
	//... every half second - at this point we also want to update the time display.
	setInterval(function () {
		date = new Date();
		clock.setTime();
		currentTime.html(clock.twelveHour(date.getHours()) + ":" + clock.checkZero(date.getMinutes()) + "<span>:" + clock.checkZero(date.getSeconds()) + "</span>");
	}, 500);

};

//The activity object is there to hold the model and controls for the view.
var Activity = function (int, obj) {
	this.idx = int;
	this.ele = obj;
    this.lengthControl = null;

	//at this point, localStorage may have altered the dom attributes, so when an activity is loaded in a new session, it must know if it's active or not.
	if (this.getActive()) {
		this.activate();
	
	//if it's not already active, we need to enable the control to activate it
	//and because it's blank, display a time string for the user
	} else {
		this.enableClickActivation();
		this.displayHour();
	}
};

//This object initializes the entire app.
var DayPlan = function (item) {
	
	var currentDate, mcClock;
	
	//what day is it?
	date = new Date();
	currentDate = date.getHours() + "-" + date.getDate() + "-" + date.getMonth() + "-" + date.getFullYear();
	
	//if the app saved the date last time
	if (localStorage.getItem("date")) {
		//if it saved it on a different day than today, we want to clear all local storage, including scheduled activity states
		if (currentDate !== localStorage.getItem("date")) {
			localStorage.clear();
			localStorage.setItem("date", currentDate);
		}
	} else {
		localStorage.setItem("date", currentDate);
	}
	
	//if the local storage wasn't wiped, we want to update the HTML containing the user-scheduled activity states
	if (localStorage.getItem("htmlString")) {
		$("#mc-master").html(localStorage.getItem("htmlString"));
	}
	
	//now we want to enable the model and controls for each of the 12 5 minute time-slots
	$(item).each(function (index) {
		activities[index] = new Activity(index, $(this));
	});
	
	//we create our clock last because it relies on our html being present to find its elements using jquery
	mcClock = new Clock();
};

//after the controls are added to an activity, we want to find them
Activity.prototype.setLengthControl = function () {
	this.lengthControl = this.ele.find(".mc-length");
};

//after drawing the length control to the screen, we want to make it control things
Activity.prototype.enableLengthControl = function () {
	var activity = this,
		//an interval constant used by the draggable object
		ivl = 25,
		//defaulting two variables for not sure why
		addedLength = 0,
		previousAddedLength = 0,
		maxLength = activity.getMaxLength();
	//this is our controller
	Draggable.create(this.lengthControl, {
		//only up and down
		type: "y",
		//we need to stop the mouse interacting with the other objects when we drag
		onPress: function () {
			$("#mc-master").css("pointer-events", "none");
			maxLength = activity.getMaxLength();
		},
		//finally, we need reenable the mouse events and save the new state to local storage
		onRelease: function () {
			$("#mc-master").css("pointer-events", "");
			localStorage.setItem("htmlString", $("#mc-master").html());
		},
		//when the user drags, we may need to hide or show elements, and change their data attributes
		liveSnap: function (endValue) {

			//real change, absolute change, an iterator, current element's max length
			var change, absChange, itr;

			//store and calculate old and new addedLength values
			previousAddedLength = addedLength;
			addedLength = Math.round(endValue / ivl);

			//fix input values to remain within array size
			if (addedLength < 0) {
				addedLength = 0;
			}
			if (addedLength > maxLength - 1) {
				addedLength = maxLength - 1;
			}

			//calculate the real change
			change = addedLength - previousAddedLength;

			//if there is no change, stop.
			if (!change) {
				return 0;
			}

			//change the view height and change the model length
			if (addedLength === 0) {
				activity.setLength(1);
				activity.ele.css("height", "");
			} else {
				activity.setLength(1 + addedLength);
				activity.ele.css("height", (8.3333333333 + (addedLength * 8.3333333333)) + "vh");
			}

			//single step hide/show
			if (change === 1) {
				activities[activity.idx + addedLength].ele.hide();
				return 0;
			}
			if (change === -1) {
				activities[activity.idx + addedLength + 1].ele.show();
				return 0;
			}

			//multilpe steps hide/show
			if (change > 0) {
				itr = change;
				while (true) {
					if (itr === 0) {
						break;
					}
					activities[activity.idx + (addedLength - change) + itr].ele.hide();
					itr = itr - 1;
				}

				return 0;
			}
			if (change < 0) {
				absChange = Math.abs(change);
				itr = absChange;
				while (true) {
					if (itr === 0) {
						break;
					}
					activities[activity.idx + (previousAddedLength - absChange) + itr].ele.show();
					itr = itr - 1;
				}
				return 0;
			}


			return console.log("error unknown");
		}
	});
};
//we need a function to bind the click-to-activate feature
Activity.prototype.enableClickActivation = function () {
	var hour = this;

	this.ele.on("click", function () {
		$(this).off("click");
		hour.activate();
	});
};

//we need a function to get the stored background color color
Activity.prototype.getColor = function () {
	return this.ele.attr("data-color");
};

//we need a function to set the view and model with a new color
Activity.prototype.setColor = function (color) {
	this.ele.attr("data-color", color);
	this.ele.addClass(color);
};

//we need a function to remove an added color
Activity.prototype.defaultColor = function () {
	this.ele.removeClass(this.getColor());
};

//we need to check if the element has the 'active' flag
Activity.prototype.getActive = function () {
	return parseInt(this.ele.attr("data-active"), 10);
};

//we need a function to set the 'active' flag
Activity.prototype.setActive = function (bool) {
	this.ele.attr("data-active", bool);
};

//we need a function to turn the time string associated with an activity
Activity.prototype.getTime = function () {
	return this.ele.attr("data-time");
};

//we need a function to write the time string to the screen
Activity.prototype.displayHour = function () {
	this.ele.html(this.getTime());
};

//we need a function to clear the controls or text from the view
Activity.prototype.removeContent = function () {
	this.ele.empty();
};

//we need a function to get the number of time slots an activity takes up
Activity.prototype.getLength = function () {
	return parseInt(this.ele.attr("data-length"), 10);
};

//we need a function to set the number of time slots an activity takes up and display it on the screen
Activity.prototype.setLength = function (int) {
	this.ele.attr("data-length", int);
	this.lengthControl.html(this.getLength() * 5 + " mins");
};

//we need a functions to get and set the maximum number of time slots available to the activity
Activity.prototype.getMaxLength = function () {
	return parseInt(this.ele.attr("data-max-length"), 10);
};
Activity.prototype.setMaxLength = function (int) {
	this.ele.attr("data-max-length", int);
};

//we need a function to get and set the saved description string associated with an activity
Activity.prototype.getDescription = function () {
	return this.ele.attr("data-description");
};
Activity.prototype.setDescription = function (string) {
	this.ele.attr("data-description", string);
};

//we need a function which inserts the correct time and (length)* of the activity * length always defaults to 1 when this is called
Activity.prototype.getControlHTML = function (time, length) {
	return "<div class='mc-time'>" + time + "</div><div class='mc-length'>" + length + " mins</div><div class='mc-description'><textarea maxlength='24'></textarea></div>";
};

//we need a function to append the controls to the activity
Activity.prototype.applyControls = function () {
	this.ele.append(this.getControlHTML(this.getTime(), this.getLength()));
};

//we need to find the delete button once its been appended to the activity
Activity.prototype.getDeleteControl = function () {
	return this.ele.find(".mc-time");
};

//we need to find the description textarea once it has been appended to the activity
Activity.prototype.getTextInput = function () {
	return this.ele.find("textarea");
};

//we need to enable saving of the input data (on each keypress)
Activity.prototype.activateTextInput = function () {
	var activity = this;
	this.getTextInput().on("keyup", function () {
		activity.setDescription($(this).val());
		localStorage.setItem("htmlString", $("#mc-master").html());
	});
};

//we need to give the user the ability to alter their plans
Activity.prototype.enableClickDetetion = function () {
	var activity = this;
	this.getDeleteControl().on("mouseup", function () {
		activity.deactivate();
	});
};

//when an empty time slot becomes a customizable activity.
Activity.prototype.activate = function () {

	var itr;

	//this function may be called on elements already flagged as active, in which case, no changes to the viewmodel are necessary
	if (!this.getActive()) {
		this.removeContent();
		this.setColor(randomColor());
		this.setActive(1);
		this.applyControls();
		this.setLengthControl();
        
		//we need to adjust the max length of all the elements between and including the beginning of the day or previous active time slot
		itr = this.idx;
		while (true) {
			if (itr === 0) {
				break;
			}
			itr = itr - 1;
			activities[itr].setMaxLength(this.idx - itr);
			if (activities[itr].getActive()) {
				break;
			}
		}
		
		//we need to update our storage!
		localStorage.setItem("htmlString", $("#mc-master").html());
		
	//we can get the user's very own unique words they saved to remind them of stuff!
	} else {
		this.getTextInput().val(this.getDescription());
	}
	
	this.enableLengthControl();
	this.enableClickDetetion();
	this.activateTextInput();
	
};

//deleting shit is of no trivial consequence. See: time travel paradoxes.
Activity.prototype.deactivate = function () {

	//itr = iterator, a = start, b = end
	var itr, a, b;

	this.removeContent();
	this.defaultColor();
	this.ele.attr("data-color", "");
	this.setActive(0);
	this.ele.css("height", "");
	this.setDescription("");
	this.enableClickActivation();
	this.displayHour();

	//show elements hidden by activity
	itr = this.getLength() - 1;
	while (true) {
		if (itr === 0) {
			break;
		}
		activities[this.idx + itr].ele.show();
		itr = itr - 1;
	}

	//now length can be changed
	this.setLength(1);

	//set A (previous-active/first element index)
	itr = this.idx;
	while (true) {
		if (itr === 0) {
			a = 0;
			break;
		}
		itr = itr - 1;
		if (activities[itr].getActive()) {
			a = itr;
			break;
		}
	}

	//set B (next-active/last element index)
	itr = this.idx;
	while (true) {
		if (itr === 11) {
			b = 11;
			break;
		}
		itr = itr + 1;
		if (activities[itr].getActive()) {
			b = itr - 1;
			break;
		}
	}

	//set the maxLength of all previous elements between A and this element
	itr = this.idx - a;
	while (true) {
		if (itr === 0) {
			break;
		}
		itr = itr - 1;
		activities[a + itr].setMaxLength(b - (a + itr) + 1);
	}
		
	//we made it! now save QUICKLY before something breaks!
	localStorage.setItem("htmlString", $("#mc-master").html());

};

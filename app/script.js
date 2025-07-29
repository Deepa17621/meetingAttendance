// Configuration - You can change these variables
const TARGET_LOCATION = {
    latitude: 37.7749,    // Change to your target latitude
    longitude: -122.4194, // Change to your target longitude
};

const BOUNDARY_RADIUS = 100; // 100 meters - change as needed
const MEETING_END_TIME = "17:00"; // Change meeting end time (24-hour format)

// Application state
let isCheckedIn = false;
let currentLocation = null;
let timeRecord = {
    checkIn: null,
    checkOut: null,
    duration: null
};
let isLoading = false;

// DOM elements
const statusIcon = document.getElementById('statusIcon');
const statusText = document.getElementById('statusText');
const locationStatus = document.getElementById('locationStatus');
const locationText = document.getElementById('locationText');
const checkInTime = document.getElementById('checkInTime');
const checkOutTime = document.getElementById('checkOutTime');
const durationRow = document.getElementById('durationRow');
const durationValue = document.getElementById('durationValue');
const actionButton = document.getElementById('actionButton');
const toastContainer = document.getElementById('toastContainer');
const meetingEndDisplay = document.getElementById('meetingEndDisplay');
const radiusDisplay = document.getElementById('radiusDisplay');

// Initialize the app
function init() {
    meetingEndDisplay.textContent = MEETING_END_TIME;
    radiusDisplay.textContent = BOUNDARY_RADIUS;
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

// Get current location
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };
                currentLocation = location;
                updateLocationStatus(location);
                resolve(location);
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000,
            }
        );
    });
}

// Check if location is within boundary
function isWithinBoundary(location) {
    const distance = calculateDistance(
        location.latitude,
        location.longitude,
        TARGET_LOCATION.latitude,
        TARGET_LOCATION.longitude
    );
    return distance <= BOUNDARY_RADIUS;
}

// Update location status display
function updateLocationStatus(location) {
    locationStatus.style.display = 'flex';
    const withinBoundary = isWithinBoundary(location);
    locationText.textContent = withinBoundary ? 'Within boundary' : 'Outside boundary';
    locationText.style.color = withinBoundary ? 'hsl(142, 76%, 36%)' : 'hsl(240, 5%, 64.9%)';
}

// Calculate duration from meeting end time
function calculateDurationFromMeetingEnd(checkOutTime) {
    const [hours, minutes] = MEETING_END_TIME.split(':').map(Number);
    const meetingEndTime = new Date(checkOutTime);
    meetingEndTime.setHours(hours, minutes, 0, 0);

    const diffMs = checkOutTime.getTime() - meetingEndTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins > 0) {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `+${hours}h ${mins}m (overtime)`;
    } else {
        const hours = Math.floor(Math.abs(diffMins) / 60);
        const mins = Math.abs(diffMins) % 60;
        return `-${hours}h ${mins}m (early)`;
    }
}

// Format time for display
function formatTime(date) {
    return date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
}

// Update UI based on check-in status
function updateUI() {
    if (isCheckedIn) {
        statusIcon.textContent = '✓';
        statusIcon.classList.add('checked-in');
        statusText.textContent = 'Checked In';
        statusText.classList.add('checked-in');
        actionButton.textContent = 'Check Out';
        actionButton.classList.add('check-out');
    } else {
        statusIcon.textContent = '✕';
        statusIcon.classList.remove('checked-in');
        statusText.textContent = 'Not Checked In';
        statusText.classList.remove('checked-in');
        actionButton.textContent = 'Check In';
        actionButton.classList.remove('check-out');
    }

    checkInTime.textContent = formatTime(timeRecord.checkIn);
    checkOutTime.textContent = formatTime(timeRecord.checkOut);

    if (timeRecord.duration) {
        durationValue.textContent = timeRecord.duration;
        durationRow.style.display = 'flex';
    } else {
        durationRow.style.display = 'none';
    }

    actionButton.disabled = isLoading;
    actionButton.textContent = isLoading ? 'Processing...' : actionButton.textContent;
}

// Show toast notification
function showToast(title, description, type = 'default') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-description">${description}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

// Handle check in
async function handleCheckIn() {
    isLoading = true;
    updateUI();
    
    try {
        const location = await getCurrentLocation();
        
        if (isWithinBoundary(location)) {
            const checkInTime = new Date();
            timeRecord.checkIn = checkInTime;
            isCheckedIn = true;
            
            showToast(
                "Check-in Successful!",
                `Checked in at ${checkInTime.toLocaleTimeString()}`,
                "success"
            );
        } else {
            showToast(
                "Check-in Failed",
                "You are not within the required boundary (100m radius)",
                "error"
            );
        }
    } catch (error) {
        showToast(
            "Location Error",
            "Unable to get your current location. Please enable location services.",
            "error"
        );
    }
    
    isLoading = false;
    updateUI();
}

// Handle check out
async function handleCheckOut() {
    isLoading = true;
    updateUI();
    
    try {
        const checkOutTime = new Date();
        const duration = calculateDurationFromMeetingEnd(checkOutTime);
        
        timeRecord.checkOut = checkOutTime;
        timeRecord.duration = duration;
        isCheckedIn = false;
        
        showToast(
            "Check-out Successful!",
            `Checked out at ${checkOutTime.toLocaleTimeString()}`,
            "success"
        );
    } catch (error) {
        showToast(
            "Check-out Error",
            "Unable to process check-out",
            "error"
        );
    }
    
    isLoading = false;
    updateUI();
}

// Main button click handler
function handleButtonClick() {
    if (isLoading) return;
    
    if (isCheckedIn) {
        handleCheckOut();
    } else {
        handleCheckIn();
    }
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', init);
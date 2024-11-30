document.addEventListener("DOMContentLoaded", function() {
    const text1 = "You look lonely";
    const text2 = "wanna go back?";
    const textContainer1 = document.getElementById("text1");
    const textContainer2 = document.getElementById("text2");
    const yesNoOptions = document.getElementById("yesno");

    // Define delay durations for each text
    const delayText1 = 110; // Delay for text1
    const delayText2 = 80; // Delay for text2 (slower)

    function typeWriter(text, element, delay, callback) {
        let index = 0;
        function typing() {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
                setTimeout(typing, delay);
            } else if (callback) {
                callback(); // Call the callback after typing is done
            }
        }
        typing();
    }

        typeWriter(text1, textContainer1, delayText1, () => {
            setTimeout(() => {
                typeWriter(text2, textContainer2, delayText2, () => {
                    // Fade in the yes/no options after typing is done
                    yesNoOptions.classList.add("visible");
                });
            }, 500); // Optional delay before the second line starts typing
        });
});


// Disable right-click
// document.addEventListener("contextmenu", function(e) {
//     e.preventDefault(); // Prevent the right-click context menu from appearing
// });

// // Disable certain key combinations
// document.onkeydown = function(e) {
//     if (e.ctrlKey && 
//         (e.keyCode === 67 || // C
//         e.keyCode === 86 || // V
//         e.keyCode === 85 || // U
//         e.keyCode === 117)) { // F6
//         // alert('not allowed');
//         return false; // Prevent the default action
//     } else {
//         return true; // Allow other keys
//     }
// };
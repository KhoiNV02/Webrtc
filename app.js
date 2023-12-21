// app.js
const socket = io();

let localStream;
let audioContext;
let audioSource;

// Lắng nghe sự kiện khi có id của người dùng
socket.on('your-id', (userId) => {
  console.log('Your ID:', userId);
});

// Lắng nghe sự kiện khi có yêu cầu kết nối từ người khác
socket.on('request-to-connect', (targetUserId) => {
  const accept = confirm(`User ${targetUserId} wants to connect with you. Do you accept?`);

  if (accept) {
    // Gửi thông báo chấp nhận kết nối đến người khác
    socket.emit('accept-connect', targetUserId);
  }
});

// Lắng nghe sự kiện khi kết nối đã được chấp nhận
socket.on('connection-established', (targetUserId) => {
  console.log(`Connection with User ${targetUserId} established`);

  // Start audio recording
  startRecording();
});

// Lắng nghe sự kiện khi nhận được dữ liệu âm thanh từ người khác
socket.on('audio', (data) => {
  if (data.senderUserId !== socket.id) {
    // Chơi âm thanh từ người khác
    playAudio(data.audio);
  }
});

// Gửi yêu cầu kết nối đến người dùng khác
document.getElementById('connectButton').onclick = () => {
  const targetUserId = prompt('Enter the target user ID:');
  socket.emit('connect-to-user', targetUserId);
};

// Ghi âm từ mic và gửi dữ liệu âm thanh qua Socket.IO
document.getElementById('startRecording').onclick = () => {
  startRecording();
};

// Dừng ghi âm
document.getElementById('stopRecording').onclick = () => {
  stopRecording();
};

function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      localStream = stream;

      // Lấy AudioContext và tạo MediaStreamAudioSourceNode
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioSource = audioContext.createMediaStreamSource(stream);

      // Bắt đầu ghi âm
      const recorder = new Recorder(audioSource);
      recorder.record();

      // Gửi dữ liệu âm thanh qua Socket.IO
      const intervalId = setInterval(() => {
        recorder.exportWAV((audioBlob) => {
          const reader = new FileReader();
          reader.onload = () => {
            socket.emit('audio', { audio: reader.result, targetUserId: targetUserId });
          };
          reader.readAsDataURL(audioBlob);
        });
        recorder.clear();
      }, 1000);

      document.getElementById('stopRecording').onclick = () => {
        clearInterval(intervalId);
        stopRecording();
      };
    })
    .catch((error) => {
      console.error('Error accessing microphone:', error);
    });
}

function stopRecording() {
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      track.stop();
    });
  }

  if (audioContext) {
    audioContext.close();
  }
}

function playAudio(audioData) {
  const audio = new Audio(audioData);
  audio.play();
}

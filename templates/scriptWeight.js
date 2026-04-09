function goNext() {
  const weight = document.getElementById("weightInput").value;

  if (!weight) {
    alert("Please enter your weight");
    return;
  }

  // navigate to calories page
  window.location.href = "calories.html";
}

function goBack() {
  window.history.back();
}
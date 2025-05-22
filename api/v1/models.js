module.exports = (req, res) => {
  res.json({
    data: [
      { id: "gemini-1.5-flash" },
      { id: "gemini-1.5-pro" }
    ]
  });
};
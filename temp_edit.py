from pathlib import Path
path = Path('App.tsx')
text = path.read_text()
text = text.replace("const [lockState, setLockState] = useState(() => Lock.state());", "const [lockState, setLockState] = useState(() => Lock.state());\n  const [updateReady, setUpdateReady] = useState(false);")
path.write_text(text)

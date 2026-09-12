import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Help() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText('https://wholesale-shop-nu.vercel.app');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="page-header">
        <h2>Help & Instructions</h2>
        <button onClick={() => navigate(-1)}>Back</button>
      </div>

      <div className="card">
        <h4>App Not Showing the Latest Update?</h4>
        <p>
          This app updates automatically most of the time. If something looks outdated,
          missing, or not working as expected after an update, try these steps in order:
        </p>
        <ol>
          <li>Close the app completely and reopen it.</li>
          <li>If that doesn't help, refresh the page (pull down on the screen, or use your browser's refresh button).</li>
          <li>
            If you installed this app to your home screen and it still looks old,
            remove the shortcut from your home screen and add it again:
            <ul>
              <li>Press and hold the app icon on your home screen</li>
              <li>Select "Remove" or "Uninstall"</li>
              <li>Open the app link <div><span>[tap to copy]</span></div><div
          onClick={handleCopy}
          style={{
            padding: '10px',
            backgroundColor: '#f0f0f0',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '14px',
            wordBreak: 'break-all',
            cursor: 'pointer',
            border: '1px dashed #999'
          }}
        >
          wholesale-shop-nu.vercel.app
        </div>
        {copied && <p style={{ color: '#1a7f37', fontSize: '13px' }}>Copied to clipboard!</p>}
     again in your browser</li>
              <li>Use "Add to Home Screen" from your browser menu to reinstall it fresh</li>
            </ul>
          </li>
        </ol>
      </div>

      <div className="card">
        <h4>Video Walkthroughs</h4>
        <p>Watch short videos covering the most common tasks:</p>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={{ marginBottom: '10px' }}>
            <a href="https://youtube.com/shorts/fho1l2u60L0?si=kvOoC0XCDqx3Lbja" target="_blank" rel="noopener noreferrer">
              Register your Shop in Meloshop App
            </a>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <a href="https://youtube.com/shorts/heuDeFUGZQg?si=gLrFQ8QuG264CRUp" target="_blank" rel="noopener noreferrer">
              List/Add Your Shop Products
            </a>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <a href="https://youtube.com/shorts/BjnYm1ljXKI?si=9O-L1yFlhyGuWQQK" target="_blank" rel="noopener noreferrer">
              Register as a Customer to a Shop
            </a>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <a href="https://youtube.com/shorts/M7vJ_kE8R94?si=QJLKrE0L0To-YHpC" target="_blank" rel="noopener noreferrer">
              Assign a Delivery Person to Your Shop
            </a>
          </li>
        </ul>
      </div>

      <div className="card">
        <h4>Need More Help?</h4>
        <p>If you're still having trouble, reach out directly:</p>
        <p><strong>Call:</strong> 07077941592</p>
        <p><strong>WhatsApp:</strong> 07013297651</p>
      </div>
    </div>
  );
}
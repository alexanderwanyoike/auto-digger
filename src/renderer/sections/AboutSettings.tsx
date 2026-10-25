import { author, description, license, version } from '../../../package.json';
import appIcon from '../../../resources/icons/icon.svg';

export function AboutSettings() {
  return (
    <section className="settings-card" aria-labelledby="about-heading">
      <h2 id="about-heading">About</h2>
      <div className="about-app">
        <img src={appIcon} width={44} height={44} alt="" aria-hidden="true" />
        <div>
          <strong>Auto Digger</strong>
          <p>Version {version}</p>
        </div>
      </div>
      <p>{description}</p>
      <p>
        {author} · {license} licence
      </p>
    </section>
  );
}

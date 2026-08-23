import {
  Layers3,
} from "lucide-react";

import "./MenuProjectSwitcher.css";


export default function MenuProjectSwitcher({
  projects = [],
  activeProjectId = "",
  onSelect,
}) {
  const readyProjects =
    projects.filter(
      project =>
        project?.id &&
        project
          ?.structured_menu
    );


  if (
    readyProjects.length ===
    0
  ) {
    return null;
  }


  return (
    <div className="menu-project-switcher">
      <div className="menu-project-switcher-title">
        <Layers3
          size={15}
        />

        <span>
          MENU MODELS
        </span>
      </div>


      <div className="menu-project-switcher-buttons">
        {readyProjects.map(
          (
            project,
            index
          ) => (
            <button
              key={
                project.id
              }
              type="button"
              className={
                project.id ===
                activeProjectId
                  ? "active"
                  : ""
              }
              title={
                project.name ||
                `Model ${index + 1}`
              }
              onClick={() =>
                onSelect?.(
                  project.id
                )
              }
            >
              {index + 1}
            </button>
          )
        )}
      </div>


      <span className="menu-project-switcher-help">
        {readyProjects.length ===
        1
          ? "1 saved model"
          : `${readyProjects.length} saved models`}
      </span>
    </div>
  );
}

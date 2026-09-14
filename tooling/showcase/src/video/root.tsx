import { Composition, getInputProps } from 'remotion';
import { type Project, projectSchema } from '#src/model';
import { durationInFrames } from '#src/timeline';
import { Film } from '#video/film';
import { RepositoryPreview } from '#video/repository-preview';

export function Root() {
  const project = projectSchema.parse(getInputProps());
  return (
    <>
      <Composition
        id="GroamShowcase"
        component={Film}
        width={project.edit.width}
        height={project.edit.height}
        fps={project.edit.fps}
        durationInFrames={durationInFrames(project.edit)}
        defaultProps={project}
        calculateMetadata={({ props }: { props: Project }) => {
          const validated = projectSchema.parse(props);
          return {
            width: validated.edit.width,
            height: validated.edit.height,
            fps: validated.edit.fps,
            durationInFrames: durationInFrames(validated.edit),
            props: validated
          };
        }}
      />
      <Composition
        id="GroamRepositoryPreview"
        component={RepositoryPreview}
        width={1280}
        height={640}
        fps={1}
        durationInFrames={1}
        defaultProps={project}
      />
    </>
  );
}

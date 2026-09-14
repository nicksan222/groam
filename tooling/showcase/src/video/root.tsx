import { Composition, getInputProps } from 'remotion';
import { type Project, projectSchema } from '#src/model';
import { durationInFrames } from '#src/timeline';
import { Film } from '#video/film';

export function Root() {
  const project = projectSchema.parse(getInputProps());
  return (
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
  );
}

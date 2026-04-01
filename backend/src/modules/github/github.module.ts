import { Module } from '@nestjs/common';
import { GithubActionsService } from './github-actions.service';

@Module({
  providers: [GithubActionsService],
  exports: [GithubActionsService],
})
export class GithubModule {}

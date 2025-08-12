import { Body, Controller, Post } from '@nestjs/common';
import { PublishMakerEventUseCase } from '../../application/usecases/publish-maker-event.usecase';

@Controller({})
export class MakerEventController {
  constructor(
    private readonly publishMakerEventUseCase: PublishMakerEventUseCase,
  ) {}

  @Post('publish')
  async publishEvent(
    @Body() body: { makerId: string; payload: Record<string, any> },
  ) {
    await this.publishMakerEventUseCase.execute(body.makerId, body.payload);
    return { status: 'published', makerId: body.makerId };
  }
}

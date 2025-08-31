import { TestBed } from '@angular/core/testing';

import { RnpService } from './rnp.service';

describe('RnpService', () => {
  let service: RnpService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RnpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
